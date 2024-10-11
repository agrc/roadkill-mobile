# Utah Roadkill Reporter

A mobile application build for DWR & UDOT for users to submit reports about roadkill.

## Setup for local development

1. create `.env` files in `<root>`, `src/front`, and `src/back`
1. from root: `docker compose up`
1. in both `src/front` and `src/back`:
   1. `npm install`
   1. `npm start`
   1. `npm test`

### Debugging

Press "j" in console after starting expo project. See [Expo Debugging & Profiling docs](https://docs.expo.dev/debugging/tools/) for more details.

### Testing Deep Links

`npx uri-scheme open exp://127.0.0.1:19000/--/main --ios`

`npx uri-scheme open exp://127.0.0.1:19000/--/main --android`

## Deployment

### Release Pipeline

| git branch | app version | runtime version | deployed                                                                                                                                                                                                                                                                         | release-channel | expo version |
|------------|-------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|--------------|
| dev        | 3.0.9       | 3.1.0           | custom dev clients for simulators are in `src/front/dev-clients`, app has an orange icon (dev clients for for physical devices can be installed directly from the expo build website)                                                                                            | default         | 50           |
| staging    | 3.0.9       | 3.1.0           | [TestFlight](https://appstoreconnect.apple.com/apps/1613421729/testflight) and [Google Play internal testing](https://play.google.com/console/u/1/developers/6377537875100906890/app/4974417822540767109/tracks/internal-testing) separate apps from production with a blue icon | staging         | 50           |
| production | 3.0.9       | 3.1.0           | App Stores                                                                                                                                                                                                                                                                       | production      | 50           |

These three environments are three separate bundle IDs (see `src/front/app.config.js`) and can all be installed on the same device simultaneously.

If you need to change something that requires a new app build (e.g. changes to `app.config.js` or any other native code library update), **bump the `runtimeVersion` prop in `app.config.js`** to keep it on a new release channel thus preventing conflicts with older app builds. `expo-update` will only download updates with matching app version numbers because we are using the ["Custom runtimeVersion" runtime policy](https://docs.expo.dev/eas-update/runtime-versions/#custom--runtimeversion).

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

1. From `/data`: `./start_cloud_sql_proxy.sh prod` (or `dev`) (This need so to be done for each environment per release!)
1. From `src/front`: `npm run update-constants` (may need to update the db connection props in `.env`)
1. Determine if the api version needs to be bumped and update [src/common/config.js](src/common/config.js) and [src/back/package.json](src/back/package.json) accordingly.
1. Determine if app version (`version` in [app.config.js](src/front/app.config.js)) needs to be bumped. Apple requires it to be bumped after every production release.
1. Determine if `runtimeVersion` needs to be bumped (if any native code has changed).
1. Bump build number in [src/front/app.config.js](src/front/app.config.js).
1. Update value in [changelog_context.json](changelog_context.json) to match new version and build number.
1. From root: `npm run changelog`
1. Clean up change log entries, if needed.
1. Create release commit (e.g. `release: v3.0.0 (123)`)
1. Tag `git tag v3.0.0-123`
1. Pushing to `staging` or `production` will push a new image to the cloud run back end.

Do one of the following from `src/front`:

1. `./scripts/deployNewAppBuild.sh` if a new app build is needed.
   1. Android: [Create new internal testing release](https://play.google.com/console/u/1/developers/6377537875100906890/app-list) in the appropriate version of the app.
   1. Apple: Promote release to *"External Testers"*. Click the "notify testers" link next to the newly uploaded build in the appropriate version of the app in [TestFlight](https://appstoreconnect.apple.com/apps).

or

1. Push an OTA update (not applicable if the `runtimeVersion` was bumped):
   - `./scripts/deployOTAUpdate.sh` to publish a new over-the-air update.

### Custom Expo Dev Client

This app uses a [custom Expo Dev](https://docs.expo.dev/development/getting-started/) rather than the old Expo Go app. This means that anytime you install or upgrade a library with native code, you need to create new builds by running `./scripts/buildForDevelopment.sh`.

### Pushing a New App Build to Production

After testing in dev client...

1. From `src/front`: `./scripts/deployNewAppBuild.sh`
1. Generate new screenshots if applicable.
   - [Apple Specs](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)
      - 5.5" - iPhone 8 Plus
      - 6.7" - iPhone 15 Pro Max
      - 12.9" - iPad Pro (2nd Gen)
      - 12.9" - iPad Pro (6th Gen)
   - Android:
      - Use any simulator
1. Create new version in iTunes connect and update all relevant information.
1. Submit the apps for review in both app stores.

### Secrets

Because app builds initiate from both the developer's machine (new native builds) and GitHub Actions (over-the-air updates), secrets need to be managed in both places. `.env.sample` should be duplicated and populated to `.env`, `.env.staging`, `.env.production`. Corresponding secrets are also stored in environments in the GitHub repository.

### Test User Links

Android Devices (Internal Testing): [Production](https://play.google.com/apps/internaltest/4699387731848346247) | [Staging](https://play.google.com/apps/internaltest/4701504858394647093). Accounts need to be added to the "Wildlife-Vehicle Collisions" tester group before they can join the test.

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

These are the images that show up next to the species/class/order/family names. They are stored in a bucket named `ut-dts-agrc-roadkill-[dev|prod]-identification-images`. Members of the `gcp-dts-ugrc-roadkill-viewers` Google Group have object admin level access to the bucket. The images should be uploaded with the file extension: `.jpg` and sized `150` by `150` pixels.

The file name should match a distinct value from one of the following columns in the `species` table:

- `species_id`
- `species_class`
- `species_order`
- `family`

If a matching file in the bucket is not found, a blank gray fallback image is returned.

## Authentication

[Authentication Process Study](https://www.notion.so/stdavis/Roadkill-Auth-Process-Study-624f63c8bc0641da931bac2f240f1d5b)
