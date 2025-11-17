const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8081;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '04246e81b0fa44278bfd1821ad90204a';
const EXPO_DEV_SERVER = 'http://localhost:8082';
const isDevelopment = !fs.existsSync(path.join(__dirname, 'static-build'));

const ALLOWED_REDIRECT_URIS = [
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}/callback` : null,
  'https://spotify-trivia-jclaeson.replit.app/callback',
  'http://localhost:8081/callback',
].filter(Boolean);

function validateRedirectUri(uri) {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}

app.post('/api/spotify/token', async (req, res) => {
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

app.post('/api/spotify/refresh', async (req, res) => {
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

if (isDevelopment) {
  console.log('Development mode: Proxying non-API requests to Expo dev server');
  
  app.use('/', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
    } else {
      createProxyMiddleware({
        target: EXPO_DEV_SERVER,
        changeOrigin: true,
        ws: true,
        onError: (err, req, res) => {
          console.error('Proxy error:', err.message);
          res.status(502).json({ error: 'Expo dev server not available' });
        }
      })(req, res, next);
    }
  });
} else {
  console.log('Production mode: Serving static files');
  
  app.use(express.static('static-build'));
  
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'static-build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Mode: ${isDevelopment ? 'Development' : 'Production'}`);
  console.log(`Spotify OAuth proxy endpoints ready:`);
  console.log(`  POST /api/spotify/token - Exchange code for tokens`);
  console.log(`  POST /api/spotify/refresh - Refresh access token`);
  if (isDevelopment) {
    console.log(`Proxying all other requests to Expo dev server at ${EXPO_DEV_SERVER}`);
  }
});
