# Wildlife-Vehicle Collision Reporter

A mobile application build for DWR & UDOT for users to submit reports about roadkill.

## Setup for local development

1. create `.env` files in `<root>`, `src/front`, and `src/back`
1. in both `src/front` and `src/back`:
   1. `npm install`
   1. `npm start`
   1. `npm test`

### Debugging

I use [Flipper](https://fbflipper.com/) with a custom Expo development client as described in [this article](https://blog.expo.dev/developing-react-native-with-expo-and-flipper-8c426bdf995a).

### Testing Deep Links

`npx uri-scheme open exp://127.0.0.1:19000/--/main --ios`

`npx uri-scheme open exp://127.0.0.1:19000/--/main --android`

## Deployment

### Release Pipeline

| branch     | version | deployed                                                                                                                                                                                                                                                                         | release-channel | expo version |
|------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|-----|
| production | 3.0.0   | App Stores                                                                                                                                                                                                                                                                       | production-v3   | 46.0.0 |
| staging    | 3.0.0   | [TestFlight](https://appstoreconnect.apple.com/apps/1613421729/testflight) and [Google Play internal testing](https://play.google.com/console/u/1/developers/6377537875100906890/app/4974417822540767109/tracks/internal-testing) separate apps from production with a blue icon | staging-v3      | 46.0.0 |
| dev        | 3.0.0   | custom dev clients for simulators are in `src/front/dev-clients`, app has an orange icon                                                                                                                                                                                         | dev-v3          | 46.0.0 |

These three environments are three separate bundle IDs (see `src/front/app.config.js`) and can all be installed on the same device simultaneously.

Release channels are based on the major number (e.g. `production-v3`). If you need to change something that requires a new app build (e.g. changes to `app.config.js` or SDK upgrade), bump the major version of the app to keep it on a new release channel thus preventing conflicts with older app builds. [src/front/scripts/getReleaseChannel.sh](src/front/scripts/getReleaseChannel.sh) returns the appropriate version number.

### Environment Variables

These values are managed in three places: `.env.*` files in your local project, [GitHub Actions Secrets](https://github.com/agrc/roadkill-mobile/settings/secrets/actions) (for back end deployments), and [Expo EAS Secrets](https://expo.dev/accounts/agrc/projects/wildlife-vehicle-collision-reporter/secrets).

### Cloud Run Secrets

These values are managed in GCP Secrets Manager. After running the terraform, make sure to populate versions for the secrets that it creates. Also create corresponding secret files in `src/back/secrets/<secret_name>/value` for local development.

### One-time Setup

1. Create the following repo secrets in GitHub for each environment:
   - `PROJECT_ID`
   - `IDENTITY_PROVIDER` & `SERVICE_ACCOUNT_EMAIL`
     - Commands for creating these are exported by terraform.
   - `EXPO_USERNAME` / `EXPO_PASSWORD`
   - Mirror environment variables found in the `.env.*` files in their corresponding repo environments as secrets for the back end. Do the same thing for the front end only the secrets go in Expo EAS.
     - base64 encode the google service file contents (e.g. `base64 -i GoogleService-Info.plist`)
1. The firebase project is created via terraform, but the apps need to be created manually via the firebase console. Follow [these steps](https://docs.expo.io/guides/setup-native-firebase/#android) from the expo docs.
   1. Enable analytics in Firebase
   1. Create a web app just to get the `measurementId` config for the `FIREBASE_MEASUREMENT_ID` env variable.

### Cutting a New Release

1. From `src/front`: `npm run update-constants` (may need to update the db connection props in `.env`)
1. Optionally bump version number in [src/front/app.config.js](src/front/app.config.js) and [package.json](package.json).
1. Determine if the api version needs to be bumped and update [src/common/config.js](src/common/config.js) and [src/back/package.json](src/back/package.json) accordingly.
1. Bump build number in [src/front/app.config.js](src/front/app.config.js).
1. Update `version` in [changelog_context.json](changelog_context.json) to match new build number.
1. From root: `npm run changelog`
1. Clean up change log entries, if needed.
1. Create release commit (e.g. `release: v3.0.0 (123)`)
1. Tag `git tag v3.0.0-123`
1. Pushing to `staging` or `production` will push a new image to the cloud run back end.

Do one of the following from `src/front`:

1. `./scripts/deployNewAppBuild.sh` if a new app build is needed.
   1. Android: [Create new internal testing release](https://play.google.com/console/u/1/developers/6377537875100906890/app/4972434106866476517/tracks/4699387731848346247/releases/11/prepare)
   1. Apple: Promote release to *"External Testers"*. Click the "notify testers" link next to the newly uploaded build in [TestFlight](https://appstoreconnect.apple.com/apps/1566659475/testflight/ios).
1. Push an OTA update:
   - `./scripts/deployOTAUpdate.sh` to publish a new over-the-air update.
   - This could break things if you have changed something that requires a new app build to be pushed through the app store (e.g. changes to [src/front/app.config.js](src/front/app.config.js)). If this is the case, bump the major app version number so that a new release channel is created.

### Custom Expo Dev Client

This app uses a [custom Expo Dev](https://docs.expo.dev/development/getting-started/) rather than the old Expo Go app. This means that anytime you install or upgrade a library with native code, you need to create new builds by running `./scripts/buildForDevelopment.sh`.

### Pushing a New App Build to Production

After testing in dev client...

1. From `src/front`: `./scripts/deployNewAppBuild.sh`
1. Generate new screenshots if applicable. Note: Google Play has a limit of 8.
1. Create new version in iTunes connect and update all relevant information.
1. Submit a [mobile deploy request ticket](https://utah.service-now.com/nav_to.do?uri=%2Fcom.glideapp.servicecatalog_cat_item_view.do%3Fv%3D1%26sysparm_id%3D360c377f13bcb640d6017e276144b056%26sysparm_link_parent%3D0b596c5c1321a240abab7e776144b056%26sysparm_catalog%3De0d08b13c3330100c8b837659bba8fb4%26sysparm_catalog_view%3Dcatalog_default) for DTS to submit the app for review. (Add note about IDFA from [expo's docs](https://docs.expo.io/versions/latest/distribution/app-stores/#ios-specific-guidelines): For IDFA questions see: "https://segment.com/docs/sources/mobile/ios/quickstart/#step-5-submitting-to-the-app-store")
1. Submit a [mobile deploy request ticket](https://utah.service-now.com/nav_to.do?uri=%2Fcom.glideapp.servicecatalog_cat_item_view.do%3Fv%3D1%26sysparm_id%3D360c377f13bcb640d6017e276144b056%26sysparm_link_parent%3D0b596c5c1321a240abab7e776144b056%26sysparm_catalog%3De0d08b13c3330100c8b837659bba8fb4%26sysparm_catalog_view%3Dcatalog_default) for DTS to submit the app to the Google Play. Add "What's New" text and link to new screenshots to the notes field.

### Steps for Creating a Expo New Release Channel

1. Update [src/front/config.js](src/front/config.js).

### Secrets

Because app builds initiate from both the developer's machine (new native builds) and GitHub Actions (over-the-air updates), secrets need to be managed in both places. `.env.sample` should be duplicated and populated to `.env`, `.env.staging`, `.env.production`. Corresponding secrets are also stored in environments in the GitHub repository.

### Test User Links

Android Devices (Internal Testing): [Production](https://play.google.com/apps/internaltest/4699387731848346247) | [Staging](https://play.google.com/apps/internaltest/4701504858394647093)

iOS Devices (TestFlight): [Production](https://testflight.apple.com/join/66Vul6Jz) | [Staging](https://testflight.apple.com/join/EbfHsLjq)

Facebook Test Account:

email: `open_vboxopy_user@tfbnw.net`  
password: `tester`

### Firebase Emulators

The back end of this application uses firebase firestore and storage emulators during local development. Go to [http://localhost:4000](http://localhost:4000) to see the UI for them.

### GPS Route Simulators

iOS: [Trip Simulator](https://github.com/billylo1/set-simulator-location-trip-simulator)

## Database

[Initial Database Design Diagram](https://lucid.app/lucidchart/invitations/accept/inv_f10797af-5cd4-49d3-a527-c5c72f39cb45?viewport_loc=-171%2C-103%2C2586%2C1780%2C0_0) - This has been replaced by [data/sql/init.sql](data/sql/init.sql) as the single source of truth for the design.

Database migrations are managed via [knex](https://knexjs.org/#Migrations) from the `./data` folder. Run `knex migrate:make <migration-name>` to create a new one.

## Identification Images

These are the images that show up next to the species/class/order/family names. They are stored in a bucket named `ut-dts-agrc-roadkill-[dev|prod]-identification-images`. Members of the `ut-dts-agrc-roadkill-viewers` Google Group have object admin level access to the bucket. The images should be uploaded with the file extension: `.jpg` and sized `150` by `150` pixels.

The file name should match a distinct value from one of the following columns in the `species` table:

- `species_id`
- `species_class`
- `species_order`
- `species_families`

If a matching file in the bucket is not found, a blank gray fallback image is returned.
