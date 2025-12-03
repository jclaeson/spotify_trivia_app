const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://guess-that-track-app.azurewebsites.net'];

const ALLOWED_REDIRECT_URIS = process.env.ALLOWED_REDIRECT_URIS
  ? process.env.ALLOWED_REDIRECT_URIS.split(',').map(u => u.trim())
  : ['https://guess-that-track-app.azurewebsites.net/callback'];

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

const staticBuildPath = path.join(__dirname, 'static-build');

if (fs.existsSync(staticBuildPath)) {
  console.log('Serving static files from static-build/');
  app.use(express.static(staticBuildPath));
  app.use((req, res) => {
    res.sendFile(path.join(staticBuildPath, 'index.html'));
  });
} else {
  console.log('Warning: static-build folder not found');
  app.get('/', (req, res) => {
    res.status(503).json({ error: 'Application not properly deployed - static files missing' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Spotify OAuth endpoints ready`);
});
