const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '04246e81b0fa44278bfd1821ad90204a';
const EXPO_DEV_SERVER = 'http://localhost:8081';
const isDevelopment = process.env.NODE_ENV !== 'production';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
      'https://spotify-trivia-jclaeson.replit.app',
      'http://localhost:8081',
    ].filter(Boolean);

const ALLOWED_REDIRECT_URIS = process.env.ALLOWED_REDIRECT_URIS
  ? process.env.ALLOWED_REDIRECT_URIS.split(',').map(u => u.trim())
  : [
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}/callback` : null,
      'https://spotify-trivia-jclaeson.replit.app/callback',
      'http://localhost:8081/callback',
    ].filter(Boolean);

const app = express();

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function validateRedirectUri(uri) {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}

const apiRouter = express.Router();

apiRouter.post('/spotify/token', async (req, res) => {
  const { code, code_verifier, redirect_uri } = req.body;

  if (!code || !code_verifier || !redirect_uri) {
    return res.status(400).json({ 
      error: 'Missing required parameters: code, code_verifier, or redirect_uri' 
    });
  }

  if (!validateRedirectUri(redirect_uri)) {
    console.error('Invalid redirect_uri attempted:', redirect_uri);
    return res.status(400).json({ 
      error: 'Invalid redirect_uri' 
    });
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: code_verifier,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Spotify token exchange error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error_description || 'Token exchange failed' 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ 
      error: 'Internal server error during token exchange' 
    });
  }
});

apiRouter.post('/spotify/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh_token' });
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: SPOTIFY_CLIENT_ID,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Spotify token refresh error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error_description || 'Token refresh failed' 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Internal server error during token refresh' 
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);

if (isDevelopment) {
  console.log('Development mode: Proxying non-API requests to Expo dev server');
  
  const expoProxy = createProxyMiddleware({
    target: EXPO_DEV_SERVER,
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Expo dev server not available' });
    }
  });
  
  app.use(expoProxy);
} else {
  const staticBuildPath = path.join(__dirname, 'static-build');
  
  if (fs.existsSync(staticBuildPath)) {
    console.log('Production mode: Serving static files from static-build/');
    app.use(express.static(staticBuildPath));
    app.use((req, res) => {
      res.sendFile(path.join(staticBuildPath, 'index.html'));
    });
  } else {
    console.log('Production mode: API-only (static files served separately by frontend container)');
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Mode: ${isDevelopment ? 'Development' : 'Production'}`);
  console.log(`Spotify OAuth proxy endpoints ready:`);
  console.log(`  POST /api/spotify/token - Exchange code for tokens`);
  console.log(`  POST /api/spotify/refresh - Refresh access token`);
  if (isDevelopment) {
    console.log(`Proxying all other requests to Expo dev server at ${EXPO_DEV_SERVER}`);
  }
});
