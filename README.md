# Wildlife-Vehicle Collision Reporter

A mobile application build for DWR & UDOT for users to submit reports about roadkill.

## Setup for local development

1. create `.env` files in `src/front` and `src/back`
1. in both `src/front` and `src/back`:
   1. `npm install`
   1. `npm start`
   1. `npm test`

### Debugging

React Native Debugger [currently has an issue](https://github.com/expo/expo/pull/10298) with the `expo-auth-session` package. Reactotron is an alternative for inspecting network traffic.

HTTP Toolkit can be used to capture network requests made from the backend. Fiddler caused issues with UtahID.

## Deployment

### One-time Setup

1. Create the following repo secrets in GitHub:
   - `PROJECT_ID_PROD` / `PROJECT_ID_STAGING`
   - `SERVICE_ACCOUNT_KEY_PROD` / `SERVICE_ACCOUNT_KEY_STAGING`
     - Service account keys for Cloud Run deployment (this account is in the terraform configs for this project and the encoded key is output as `service_account.txt`)
   - `EXPO_USERNAME` / `EXPO_PASSWORD`

### Steps for Creating a New Release Channel

1. Update both "Production" and "Staging" env contexts in `.github/workflows/front.yml`.

### Steps for Deploying a New Native App Build

1. TODO

### Over-the-air Updates

These are done automatically for the production and staging release channels via [GitHub actions](.github/workflows/front.yml).
