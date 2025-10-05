# Gemini API Integration Setup Guide

This guide explains how to securely set up and use the Google Gemini API in your Loop Studio application.

## Overview

The Loop Studio application integrates with Google's Gemini AI API through a secure Netlify serverless function. The API key is never exposed to the frontend and all requests are processed server-side with proper security measures.

## Security Features

- **Server-side API Key Storage**: The Gemini API key is stored securely in Netlify environment variables, never exposed to the client
- **Rate Limiting**: 10 requests per minute per IP address to prevent abuse
- **Input Validation**: Request size limits and content validation
- **Security Headers**: CSP, X-Frame-Options, X-XSS-Protection, and other security headers
- **Request Logging**: All requests are logged for monitoring (without sensitive data)
- **Error Handling**: Generic error messages to avoid information leakage

## Setup Instructions

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key or use an existing one
4. Copy the API key (keep it secure!)

### 2. Configure Netlify Environment Variable

1. Go to your Netlify dashboard
2. Navigate to your site settings
3. Go to "Environment variables" in the Build & deploy section
4. Add a new environment variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (paste the full key)
   - **Scopes**: Check "Builds" and "Functions" (or "All scopes" for simplicity)

### 3. Deploy Your Changes

1. Commit and push your changes to your repository
2. Netlify will automatically rebuild and deploy with the new environment variable

### 4. Test the Integration

1. Visit your deployed application
2. Try using a feature that calls the Gemini API (like the sandbox chat)
3. Check that responses are generated (not mock mode)
4. Verify that rate limiting works by making multiple rapid requests

## Security Best Practices

### API Key Management
- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Rotate API keys regularly
- Monitor API usage in Google Cloud Console

### Rate Limiting
- The function includes built-in rate limiting (10 requests/minute per IP)
- For production use, consider implementing more sophisticated rate limiting with Redis
- Monitor for abuse patterns in your Netlify function logs

### Error Handling
- The function provides generic error messages to avoid leaking sensitive information
- Check Netlify function logs for detailed error information
- Implement proper fallback to mock mode when API is unavailable

### Monitoring
- Enable Netlify Analytics to monitor function usage
- Set up alerts for function failures
- Regularly review API usage in Google Cloud Console

## Troubleshooting

### Common Issues

**"Service configuration error"**
- Check that the `GEMINI_API_KEY` environment variable is set in Netlify
- Verify the API key is valid and not expired
- Ensure the key has the necessary permissions

**"Rate limit exceeded"**
- Wait a moment before making another request
- The limit is 10 requests per minute per IP address
- For higher limits, consider upgrading your Google Cloud plan

**Mock mode always active**
- Check that the API key is correctly set in Netlify environment variables
- Verify the function is deployed and accessible
- Check Netlify function logs for errors

**CORS errors**
- The function includes proper CORS headers
- Ensure you're calling the correct Netlify function URL: `/.netlify/functions/gemini-api`

### Checking Function Logs

1. Go to your Netlify dashboard
2. Navigate to "Functions" in the left sidebar
3. Click on the "gemini-api" function
4. View the logs to see detailed error information

### Testing API Key Validity

You can test your API key directly:

```bash
curl -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello, test message"}]
    }]
  }'
```

Replace `YOUR_API_KEY` with your actual key. A successful response indicates the key is working.

## Supported Features

The current integration supports:

- **Text Generation**: `generateContent` action for chat and content generation
- **Model Listing**: `listModels` action to get available Gemini models
- **Workspace Generation**: Generate content from project assets and canvas
- **Build Processing**: Process structured build workflows

## Future Enhancements

- Image generation (currently commented out due to endpoint changes)
- Streaming responses for real-time chat
- Advanced rate limiting with Redis
- API usage analytics and billing alerts

## Support

If you encounter issues:

1. Check this documentation first
2. Review Netlify function logs
3. Test your API key directly with curl
4. Check Google Cloud Console for API usage and errors
5. Ensure your Netlify site is properly configured

For additional help, refer to:
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
