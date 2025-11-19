# Deploying Guess That Track to Azure Kubernetes Service (AKS)

This guide walks you through deploying the Spotify trivia game to Azure Kubernetes Service, giving you hands-on experience with Docker, Kubernetes, and Azure cloud infrastructure.

## Prerequisites

Before starting, ensure you have:

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- [Docker](https://docs.docker.com/get-docker/) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- An Azure subscription
- Spotify Developer credentials (Client ID & Secret)

## Architecture Overview

```
Internet → Azure Load Balancer → Ingress Controller
                                      ↓
                        ┌─────────────┴──────────────┐
                        ↓                            ↓
                  Frontend Service            Backend Service
                        ↓                            ↓
                  Frontend Pods (3)            Backend Pods (2)
                  (Nginx + Expo web)           (Node.js Express)
```

## Step 1: Azure Container Registry (ACR)

Create a container registry to store your Docker images.

```bash
# Set variables
RESOURCE_GROUP="guess-that-track-rg"
LOCATION="eastus"
ACR_NAME="guessthattrackacr"  # Must be globally unique, lowercase alphanumeric only

# Login to Azure
az login

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --location $LOCATION

# Enable admin access (for simplicity)
az acr update -n $ACR_NAME --admin-enabled true

# Login to ACR
az acr login --name $ACR_NAME
```

## Step 2: Build and Push Docker Images

Build your application containers and push them to ACR.

```bash
# Build backend image with version tag
docker build -f Dockerfile.backend -t $ACR_NAME.azurecr.io/guess-that-track-backend:v1.0.0 .

# Build frontend image with version tag
docker build -f Dockerfile.frontend -t $ACR_NAME.azurecr.io/guess-that-track-frontend:v1.0.0 .

# Push images to ACR
docker push $ACR_NAME.azurecr.io/guess-that-track-backend:v1.0.0
docker push $ACR_NAME.azurecr.io/guess-that-track-frontend:v1.0.0

# Verify images
az acr repository list --name $ACR_NAME --output table
```

## Step 3: Create AKS Cluster

Create a Kubernetes cluster in Azure.

```bash
CLUSTER_NAME="guess-that-track-aks"

# Create AKS cluster (this takes 5-10 minutes)
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --attach-acr $ACR_NAME \
  --generate-ssh-keys \
  --location $LOCATION

# Get credentials to access the cluster
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# Verify connection
kubectl get nodes
```

You should see 2 nodes in "Ready" status.

## Step 4: Install Nginx Ingress Controller

Install the ingress controller to route external traffic.

```bash
# Add the ingress-nginx repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install nginx ingress controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz

# Wait for external IP to be assigned (this may take a few minutes)
kubectl get service -n ingress-nginx nginx-ingress-ingress-nginx-controller --watch
```

Once you see an EXTERNAL-IP (not `<pending>`), press Ctrl+C and note the IP address.

## Step 5: Configure Kubernetes Secrets

Encode your Spotify credentials and create the secret.

```bash
# Encode your credentials (replace with actual values)
echo -n "YOUR_SPOTIFY_CLIENT_ID" | base64
echo -n "YOUR_SPOTIFY_CLIENT_SECRET" | base64
echo -n "YOUR_SESSION_SECRET" | base64

# Copy the template
cp k8s/secret.yaml.template k8s/secret.yaml

# Edit k8s/secret.yaml and replace the base64 placeholders with your encoded values
# Use your preferred text editor:
nano k8s/secret.yaml
# or
vim k8s/secret.yaml

# Apply the secret
kubectl apply -f k8s/secret.yaml

# IMPORTANT: Delete the file after applying (don't commit it!)
rm k8s/secret.yaml

# Verify secret was created
kubectl get secrets
```

## Step 6: Update Kubernetes Manifests

Update the manifests with your ACR name and domain.

```bash
# Update deployment files to use your ACR
# Note: On macOS, use 'sed -i ""' instead of 'sed -i'
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i "" "s/<YOUR_ACR_NAME>/$ACR_NAME/g" k8s/backend-deployment.yaml
  sed -i "" "s/<YOUR_ACR_NAME>/$ACR_NAME/g" k8s/frontend-deployment.yaml
else
  sed -i "s/<YOUR_ACR_NAME>/$ACR_NAME/g" k8s/backend-deployment.yaml
  sed -i "s/<YOUR_ACR_NAME>/$ACR_NAME/g" k8s/frontend-deployment.yaml
fi

# Get your ingress IP
INGRESS_IP=$(kubectl get service -n ingress-nginx nginx-ingress-ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Your Ingress IP: $INGRESS_IP"

# Update ingress.yaml and configmap.yaml with your domain
# If you have a domain, update it in the files manually
# Otherwise, you can use the IP address with nip.io for testing:
DOMAIN="$INGRESS_IP.nip.io"

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i "" "s/your-domain.com/$DOMAIN/g" k8s/ingress.yaml
  sed -i "" "s/your-domain.com/$DOMAIN/g" k8s/configmap.yaml
else
  sed -i "s/your-domain.com/$DOMAIN/g" k8s/ingress.yaml
  sed -i "s/your-domain.com/$DOMAIN/g" k8s/configmap.yaml
fi

echo "Your app will be available at: http://$DOMAIN"
```

## Step 7: Update Spotify Redirect URIs

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. Add these Redirect URIs:
   ```
   http://YOUR_IP.nip.io/callback
   https://YOUR_IP.nip.io/callback
   ```
5. Save changes

## Step 8: Deploy to Kubernetes

Deploy all components to your cluster.

```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# Apply ingress
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services
kubectl get ingress
```

Wait for all pods to be in "Running" status:

```bash
kubectl get pods --watch
```

## Step 9: Verify Deployment

Test your application:

```bash
# Get the ingress address
kubectl get ingress guess-that-track-ingress

# Test backend health
curl http://$DOMAIN/health

# Open in browser
echo "Visit: http://$DOMAIN"
```

## Step 10: View Logs (Debugging)

If something isn't working:

```bash
# View backend logs
kubectl logs -l component=backend --tail=100 -f

# View frontend logs
kubectl logs -l component=frontend --tail=100 -f

# Describe pods to see events
kubectl describe pod -l component=backend
kubectl describe pod -l component=frontend

# Check ingress
kubectl describe ingress guess-that-track-ingress
```

## Scaling Your Application

Kubernetes makes scaling easy:

```bash
# Scale backend to 5 replicas
kubectl scale deployment backend --replicas=5

# Scale frontend to 10 replicas
kubectl scale deployment frontend --replicas=10

# Enable auto-scaling (HPA)
kubectl autoscale deployment backend --cpu-percent=70 --min=2 --max=10
kubectl autoscale deployment frontend --cpu-percent=70 --min=3 --max=20

# Check autoscaler status
kubectl get hpa
```

## Updating Your Application

When you make code changes:

```bash
# Rebuild and push new images with version tag
VERSION="v1.0.1"
docker build -f Dockerfile.backend -t $ACR_NAME.azurecr.io/guess-that-track-backend:$VERSION .
docker push $ACR_NAME.azurecr.io/guess-that-track-backend:$VERSION

# Update deployment
kubectl set image deployment/backend backend=$ACR_NAME.azurecr.io/guess-that-track-backend:$VERSION

# Watch rollout
kubectl rollout status deployment/backend

# Rollback if needed
kubectl rollout undo deployment/backend
```

## SSL/TLS with Let's Encrypt (Optional)

For production, add HTTPS:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update ingress.yaml to uncomment TLS section and cert-manager annotation
# Then reapply:
kubectl apply -f k8s/ingress.yaml
```

## Monitoring with Azure Monitor

Enable container insights:

```bash
az aks enable-addons \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --addons monitoring
```

View metrics in Azure Portal → Your AKS Cluster → Insights

## Cost Management

**Estimated Monthly Costs:**
- AKS cluster (2 x B2s nodes): ~$60/month
- Azure Container Registry (Basic): ~$5/month
- Load Balancer: ~$20/month
- **Total**: ~$85/month

**To minimize costs:**
```bash
# Stop cluster when not in use (deallocates nodes)
az aks stop --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# Start cluster
az aks start --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME
```

## Cleanup

When you're done learning, delete all resources:

```bash
# Delete the entire resource group (removes everything)
az group delete --name $RESOURCE_GROUP --yes --no-wait

# Or delete just the AKS cluster
az aks delete --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --yes --no-wait
```

## Troubleshooting

**Pods not starting:**
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Ingress not working:**
```bash
kubectl get ingress -o yaml
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

**Image pull errors:**
```bash
# Verify ACR integration
az aks check-acr --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --acr $ACR_NAME.azurecr.io
```

**Backend can't connect to frontend:**
- Verify ConfigMap has correct FRONTEND_URL
- Check CORS settings in server.js

## Next Steps

Now that you have a working Kubernetes deployment, explore:

1. **CI/CD**: Set up GitHub Actions to auto-deploy on push
2. **Monitoring**: Add Prometheus and Grafana for metrics
3. **Logging**: Implement centralized logging with Azure Log Analytics
4. **Security**: Add network policies and pod security policies
5. **Database**: Add PostgreSQL using Helm charts
6. **Redis**: Add caching layer for better performance

## Useful Commands Cheat Sheet

```bash
# View all resources
kubectl get all

# Get pod details
kubectl get pods -o wide

# Execute command in pod
kubectl exec -it <pod-name> -- /bin/sh

# Port forward for local testing
kubectl port-forward svc/backend 8080:8080

# View cluster info
kubectl cluster-info

# View resource usage
kubectl top nodes
kubectl top pods

# View events
kubectl get events --sort-by='.lastTimestamp'
```

## Learning Resources

- [Kubernetes Official Documentation](https://kubernetes.io/docs/)
- [Azure Kubernetes Service Docs](https://docs.microsoft.com/en-us/azure/aks/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

---

**Congratulations!** You've successfully deployed a production-ready application to Kubernetes on Azure. This setup demonstrates industry-standard containerization, orchestration, and cloud deployment practices.
