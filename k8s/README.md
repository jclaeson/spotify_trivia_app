# Kubernetes Deployment Files

This directory contains all the necessary Kubernetes manifests and Docker configurations to deploy "Guess That Track" to Azure Kubernetes Service (AKS).

## Quick Start

1. **Read the deployment guide**: Start with [DEPLOY.md](./DEPLOY.md) for complete step-by-step instructions
2. **Build Docker images**: Use the Dockerfiles in the project root
3. **Configure secrets**: Copy and edit `secret.yaml.template`
4. **Deploy to AKS**: Follow the guide to create your cluster and deploy

## Files Overview

### Docker Configuration
- `../Dockerfile.backend` - Containerizes the Express OAuth server
- `../Dockerfile.frontend` - Multi-stage build: Expo web + Nginx
- `../.dockerignore` - Excludes unnecessary files from Docker builds
- `nginx.conf` - Nginx configuration for serving the Expo web app

### Kubernetes Manifests
- `configmap.yaml` - Non-sensitive configuration (URLs, ports, env vars)
- `secret.yaml.template` - Template for Spotify credentials (DO NOT commit the actual secret!)
- `backend-deployment.yaml` - Backend deployment (2 replicas)
- `frontend-deployment.yaml` - Frontend deployment (3 replicas)
- `backend-service.yaml` - ClusterIP service for backend
- `frontend-service.yaml` - ClusterIP service for frontend
- `ingress.yaml` - Nginx ingress for routing external traffic

### Documentation
- `DEPLOY.md` - Complete deployment guide with Azure CLI commands
- `README.md` - This file

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Azure Load Balancer (Public IP)       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│         Nginx Ingress Controller                │
│  Routes:                                        │
│    /api/*      → backend:8080                   │
│    /callback   → backend:8080                   │
│    /health     → backend:8080                   │
│    /*          → frontend:80                    │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│ Frontend Svc   │   │ Backend Svc     │
│ (ClusterIP)    │   │ (ClusterIP)     │
└───────┬────────┘   └────────┬────────┘
        │                     │
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│ Frontend Pods  │   │ Backend Pods    │
│ (3 replicas)   │   │ (2 replicas)    │
│ Nginx + Static │   │ Node.js Express │
└────────────────┘   └─────────────────┘
```

## Key Concepts Demonstrated

This deployment showcases several Kubernetes best practices:

1. **Multi-container architecture** - Separate frontend and backend services
2. **ConfigMaps & Secrets** - Proper configuration management
3. **Resource limits** - CPU and memory constraints for cost control
4. **Health checks** - Liveness and readiness probes for reliability
5. **Horizontal scaling** - Multiple replicas for high availability
6. **Ingress routing** - Path-based routing to different services
7. **Session affinity** - Sticky sessions for OAuth flows

## Common Tasks

### Deploy everything
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Update configuration
```bash
kubectl edit configmap guess-that-track-config
kubectl rollout restart deployment/backend
kubectl rollout restart deployment/frontend
```

### View logs
```bash
kubectl logs -l component=backend --tail=100 -f
kubectl logs -l component=frontend --tail=100 -f
```

### Scale services
```bash
kubectl scale deployment backend --replicas=5
kubectl scale deployment frontend --replicas=10
```

### Debug pods
```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl exec -it <pod-name> -- /bin/sh
```

## Security Considerations

1. **Never commit `secret.yaml`** - It contains sensitive credentials
2. **Use Azure Key Vault** - For production, integrate with Azure Key Vault
3. **Enable RBAC** - Use role-based access control
4. **Network policies** - Restrict pod-to-pod communication
5. **SSL/TLS** - Use cert-manager for HTTPS (see DEPLOY.md)

## Cost Optimization

- **Development**: Use 1 node with smaller pod counts
- **Production**: Use autoscaling to handle variable load
- **Off-hours**: Stop the cluster when not in use
- **Right-size resources**: Adjust CPU/memory requests and limits

## Next Steps

After deploying successfully:

1. Set up CI/CD with GitHub Actions
2. Add monitoring with Prometheus/Grafana
3. Implement centralized logging
4. Configure auto-scaling (HPA)
5. Add SSL certificates
6. Set up a custom domain

## Support

For issues or questions:
- Check [DEPLOY.md](./DEPLOY.md) for troubleshooting steps
- Review Kubernetes logs: `kubectl logs <pod-name>`
- Check ingress: `kubectl describe ingress`
- Verify services: `kubectl get svc`
