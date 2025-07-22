# Login Setup & Configuration Guide

## Overview
This application supports multiple authentication methods:
- **Demo Login**: Pre-configured demo account for testing
- **Microsoft SSO**: Single Sign-On using Microsoft Azure AD
- **Google SSO**: Single Sign-On with Google (placeholder - not yet implemented)

## Quick Start - Demo Account
For immediate testing, use the demo credentials:
- **Email**: `demo@example.com`
- **Password**: `demo123!`

## Microsoft SSO Setup

### 1. Azure AD App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: Your App Name (e.g., "AI Chat Assistant")
   - **Supported account types**: Choose based on your needs:
     - **Single tenant**: Only users in your organization
     - **Multi-tenant**: Users in any organization
     - **Personal accounts**: Include personal Microsoft accounts
   - **Redirect URI**: 
     - Type: `Single-page application (SPA)`
     - URL: `http://localhost:5173` (for development)

### 2. Configure Application
After registration:
1. Go to **Authentication** tab
2. Under **Implicit grant and hybrid flows**, enable:
   - ✅ **ID tokens (used for implicit and hybrid flows)**
3. Under **Advanced settings**:
   - Set **Allow public client flows** to **Yes**

### 3. Get Application Credentials
1. Go to the **Overview** tab
2. Copy the **Application (client) ID**
3. Optionally copy **Directory (tenant) ID** if using single tenant

### 4. Environment Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Microsoft credentials:
   ```env
   REACT_APP_MICROSOFT_CLIENT_ID=your-actual-client-id-here
   # REACT_APP_MICROSOFT_TENANT_ID=your-tenant-id-here  # Uncomment for single tenant
   ```

### 5. Update Production Redirect URI
For production deployment, add your production URL to the redirect URIs in Azure AD:
- Go to **Authentication** > **Add URI**
- Add: `https://yourdomain.com`

## Testing Microsoft SSO

### Development Testing
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page
3. Click the **Microsoft** button
4. You should see a Microsoft login popup
5. Sign in with your Microsoft account
6. The popup will close and you'll be logged into the app

### Testing Different Account Types
- **Work/School Account**: Use your organization email
- **Personal Account**: Use @hotmail.com, @outlook.com, etc.
- **Guest Account**: If invited to an organization

### Common Issues & Solutions

#### 1. "AADSTS50011: The reply URL specified in the request does not match"
- **Cause**: Redirect URI mismatch
- **Solution**: Ensure the redirect URI in Azure AD matches your app URL exactly

#### 2. "AADSTS700016: Application not found in directory"
- **Cause**: Incorrect client ID or tenant configuration
- **Solution**: Verify `REACT_APP_MICROSOFT_CLIENT_ID` in `.env`

#### 3. Popup blocked by browser
- **Cause**: Browser popup blocker
- **Solution**: Allow popups for your domain or use redirect flow

#### 4. Network errors in development
- **Cause**: HTTPS requirements in some browsers
- **Solution**: Access via `http://localhost:5173` (not 127.0.0.1)

## Logout
The logout functionality will:
1. Clear local authentication state
2. Optionally sign out from Microsoft (can be implemented)

## Security Considerations

### Production Checklist
- [ ] Use HTTPS in production
- [ ] Configure proper CORS settings
- [ ] Set appropriate redirect URIs
- [ ] Consider implementing proper session management
- [ ] Add proper error handling and logging
- [ ] Implement token refresh logic if needed

### Environment Variables Security
- Never commit `.env` files to version control
- Use different client IDs for development/staging/production
- Consider using Azure Key Vault for production secrets

## API Permissions
The current configuration requests these Microsoft Graph permissions:
- `User.Read`: Read basic user profile
- `profile`: Access basic profile information
- `email`: Access user's email address
- `openid`: OpenID Connect sign-in

## Customization

### Multi-tenant vs Single-tenant
- **Multi-tenant**: Users from any organization can sign in
- **Single-tenant**: Only users from your specific organization
- Configure via the `authority` in `src/config/msalConfig.ts`

### Additional Scopes
To request more permissions, edit `src/config/msalConfig.ts`:
```typescript
export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'profile', 'email', 'openid', 'Files.Read'], // Add more scopes
};
```

## Support
For issues with:
- **Application setup**: Check this guide and Azure AD documentation
- **Microsoft authentication**: Visit [MSAL.js documentation](https://docs.microsoft.com/azure/active-directory/develop/msal-js-initializing-client-applications)
- **Development**: Check browser console for detailed error messages