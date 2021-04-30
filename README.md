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

## Deployment steps
