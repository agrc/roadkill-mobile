# Wildlife-Vehicle Collision Reporter

A mobile application build for DWR & UDOT for users to submit reports about roadkill.

## Setup for local development

1. create `.env` files in `<root>`, `src/front`, and `src/back`
1. in both `src/front` and `src/back`:
   1. `npm install`
   1. `npm start`
   1. `npm test`

### Debugging

I've [patched](src/front/patches/expo-random+11.2.0.patch) `expo-random` to work around [an issue](https://github.com/expo/expo/pull/10298) React Native Debugger with the `expo-auth-session` package. Reactotron is an alternative for inspecting network traffic that I've since removed.

HTTP Toolkit can be used to capture network requests made from the backend. Fiddler caused issues with UtahID.

### Testing Deep Links

`npx uri-scheme open exp://127.0.0.1:19000/--/main --ios`

`npx uri-scheme open exp://127.0.0.1:19000/--/main --android`

## Deployment

### Release Pipeline

| branch     | version | deployed                | release-channel | expo version |
| ---------- | ------- | ----------------------- | --------------- | ------------ |
| production | 3.0.0   | App Stores              | production-v3   | 42.0.0       |
| staging    | 3.0.0   | TestFlight/Google Alpha | staging-v3      | 42.0.0       |
| dev        | 3.0.0   | n/a                     | dev-v3          | 42.0.0       |

Release channels are based on the major number (e.g. `production-v3`). If you need to change something that requires a new app build (e.g. changes to `app.config.js` or SDK upgrade), bump the major version of the app to keep it on a new release channel thus preventing conflicts with older app builds. [src/front/getReleaseChannel.sh](src/front/getReleaseChannel.sh) returns the appropriate version number.

### Environment Variables

These values are managed in two places: `.env.*` files in your local project and [GitHub Actions Secrets](https://github.com/agrc/roadkill-mobile/settings/secrets/actions). These values are injected into the deploy action in [.github/workflows/front.yml](.github/workflows/front.yml). Any new variable needs to be added in these three places. Any change to a variable value needs to be updated in the local files and GHA Secrets.

### One-time Setup

1. Create the following repo secrets in GitHub:
   - `PROJECT_ID_PROD` / `PROJECT_ID_STAGING`
   - `SERVICE_ACCOUNT_KEY_PROD` / `SERVICE_ACCOUNT_KEY_STAGING`
     - Service account keys for Cloud Run deployment (this account is in the terraform configs for this project and the encoded key is output as `service_account.txt`)
   - `EXPO_USERNAME` / `EXPO_PASSWORD`
   - Mirror environment variables found in the `.env.*` files in their corresponding repo environments as secrets.
     - base64 encode the google service file contents (e.g. `base64 -i GoogleService-Info.plist`)
1. The firebase project is created via terraform, but the apps need to be created manually via the firebase console. Follow [these steps](https://docs.expo.io/guides/setup-native-firebase/#android) from the expo docs.
   1. Enable analytics in Firebase
   1. Create a web app just to get the `measurementId` config for the `FIREBASE_MEASUREMENT_ID` env variable.

### Cutting a New Release

1. From root: `npm run changelog`
1. Update version/build number in [CHANGELOG.md](CHANGELOG.md).
   - build number should be `git rev-list --count HEAD` + `1` to account for the release commit.
1. Clean up change log entries, if needed.
1. Create release commit (e.g. `v3.0.0 (123)`)
1. Pushing to `staging` or `production` will push an OTA update via GHA to the front end and a new image to the cloud run back end. This could break things if you have changed something that requires a new app build to be pushed through the app store (e.g. changes to [src/front/app.config.js](src/front/app.config.js)). If this is the case, bump the major app version number so that a new release channel is created.

### Pushing a New App Build to Staging

1. `git checkout staging`
1. `./deployNewAppBuild.sh`
1. Manually upload \*.aab file to [Google Play Console](https://play.google.com/console/u/1/developers/6377537875100906890/app/4972434106866476517/bundle-explorer)

### Pushing a New App Build to Production

1. `git rebase staging master`
1. `npm ci`
1. `./deployNewAppBuild.sh production-<version number>` (e.g. `production-v3.1`)
1. Build version that can be tested in ios Simulator: `expo build:ios --release-channel $RELEASE_CHANNEL --no-publish -t simulator`
1. Test in iOS and Android simulators.
1. Generate new screenshots if applicable. Note: Google Play has a limit of 8.
1. Create new version in iTunes connect and update all relevant information.
1. Submit a [mobile deploy request ticket](https://utah.service-now.com/nav_to.do?uri=%2Fcom.glideapp.servicecatalog_cat_item_view.do%3Fv%3D1%26sysparm_id%3D360c377f13bcb640d6017e276144b056%26sysparm_link_parent%3D0b596c5c1321a240abab7e776144b056%26sysparm_catalog%3De0d08b13c3330100c8b837659bba8fb4%26sysparm_catalog_view%3Dcatalog_default) for DTS to submit the app for review. (Add note about IDFA from [expo's docs](https://docs.expo.io/versions/latest/distribution/app-stores/#ios-specific-guidelines): For IDFA questions see: "https://segment.com/docs/sources/mobile/ios/quickstart/#step-5-submitting-to-the-app-store")
1. Submit a [mobile deploy request ticket](https://utah.service-now.com/nav_to.do?uri=%2Fcom.glideapp.servicecatalog_cat_item_view.do%3Fv%3D1%26sysparm_id%3D360c377f13bcb640d6017e276144b056%26sysparm_link_parent%3D0b596c5c1321a240abab7e776144b056%26sysparm_catalog%3De0d08b13c3330100c8b837659bba8fb4%26sysparm_catalog_view%3Dcatalog_default) for DTS to submit the app to the Google Play. Add "What's New" text and link to new screenshots to the notes field.

### Over-the-air Updates

These are done automatically for the production and staging release channels via [GitHub Actions](.github/workflows/front.yml) when pushing to the `main` and `staging` channels respectively.

### Steps for Creating a Expo New Release Channel

1. Update "Production" env context in `.github/workflows/front.yml`.
1. Update [src/front/config.js](src/front/config.js).

### Secrets

Because app builds initiate from both the developer's machine (new native builds) and GitHub Actions (over-the-air updates), secrets need to be managed in both places. `.env.sample` should be duplicated and populated to `.env`, `.env.staging`, `.env.production`. Corresponding secrets are also stored in environments in the GitHub repository.

### Social OAuth Providers

Note that google oauth is done exclusively through the prod GCP project for all app environments since there's no real need to differentiate between environments.

### Test User Links

Android Devices (Internal Testing): https://play.google.com/apps/internaltest/4699387731848346247

iOS Devices (TestFlight): https://testflight.apple.com/join/66Vul6Jz

Facebook: Until the app is approved in the Google Play or App Store, we can only test with this test account:

email: `open_vboxopy_user@tfbnw.net`  
password: `tester`

## Database

[Initial Database Design Diagram](https://lucid.app/lucidchart/invitations/accept/inv_f10797af-5cd4-49d3-a527-c5c72f39cb45?viewport_loc=-171%2C-103%2C2586%2C1780%2C0_0) - This has been replaced by [data/sql/init.sql](data/sql/init.sql) as the single source of truth for the design.
