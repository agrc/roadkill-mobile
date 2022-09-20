# [v3.0.0-533](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-531...v3.0.0-533) (2022-09-20)


### Bug Fixes

* **back:** return animal coords in object form for email notifications ([9069976](https://github.com/agrc/roadkill-mobile/commit/906997625a64c8105e5b607db2d4b6d58295be61)), closes [#183](https://github.com/agrc/roadkill-mobile/issues/183)
* **front:** fix bug causing full name searches to fail ([cc38bda](https://github.com/agrc/roadkill-mobile/commit/cc38bdadf3d99181c4e255883c600efbcedcc492)), closes [#182](https://github.com/agrc/roadkill-mobile/issues/182)
* **front:** handle "/"s in identification image names ([fec0047](https://github.com/agrc/roadkill-mobile/commit/fec00479e634d8cdca6958ddb5f6a645ed801196)), closes [#179](https://github.com/agrc/roadkill-mobile/issues/179)
* **front:** prevent empty tracking route submissions ([eadb1ff](https://github.com/agrc/roadkill-mobile/commit/eadb1ff6ac29446f64042b62e4a6e25e2239dd93)), closes [#189](https://github.com/agrc/roadkill-mobile/issues/189)
* **front:** switch to hybrid basemap ([05c19c4](https://github.com/agrc/roadkill-mobile/commit/05c19c4f4b2e98ef917c4737750e162e5150d0f4)), closes [#122](https://github.com/agrc/roadkill-mobile/issues/122)
* link to Google Maps rather than internal map for notification emails, closes [#183](https://github.com/agrc/roadkill-mobile/issues/183)


### Features

* **front:** Add about screen ([7a84bde](https://github.com/agrc/roadkill-mobile/commit/7a84bdecd888d0eb850917b5c272c1e26a446b63)), closes [#92](https://github.com/agrc/roadkill-mobile/issues/92)
* **front:** add confirmation dialog after offline data submission ([0e0cb29](https://github.com/agrc/roadkill-mobile/commit/0e0cb2971be07f4e23cd4428178d8fcaa7f70524)), closes [#181](https://github.com/agrc/roadkill-mobile/issues/181)



# [v3.0.0-531](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-530...v3.0.0-531) (2022-07-21)


### Bug Fixes

* **front:** handle attempt to load reports while offline ([5ded138](https://github.com/agrc/roadkill-mobile/commit/5ded13815223b8b27dcf1822db36eb2ac783b67c))



# [v3.0.0-530](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-529...v3.0.0-530) (2022-04-12)


### Bug Fixes

* **back:** disable click tracking for all emails in all envs ([9e613f3](https://github.com/agrc/roadkill-mobile/commit/9e613f33b9d5a8738b3690b44f11e5df6d88dc12))
* **back:** fix incorrect clickTracking setting in non-dev ([9011c69](https://github.com/agrc/roadkill-mobile/commit/9011c69cacbad97d07f31a9e7c7a3054e175334b))
* **front:** fix bug causing agency users to see contractor new report vehicle tracking alert ([105fab7](https://github.com/agrc/roadkill-mobile/commit/105fab79d056216eb5e8061ec28753aa19c87159))



# [v3.0.0-529](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-526...v3.0.0-529) (2022-04-12)


### Bug Fixes

* **front:** add spoof scheme to jest tests ([a25a15d](https://github.com/agrc/roadkill-mobile/commit/a25a15d47074468b03e873963fdec5690c5b1413))
* **front:** fix bug preventing pickups from being associated with routes ([f8eb2e7](https://github.com/agrc/roadkill-mobile/commit/f8eb2e75b7710306d210c1b068bd17351c24451a))
* **front:** fix circular dependency ([98a8cd8](https://github.com/agrc/roadkill-mobile/commit/98a8cd8b8d869d07194de335e5f9c412b6f5ec40))
* **front:** fix hidden route polylines ([da51dbb](https://github.com/agrc/roadkill-mobile/commit/da51dbbf05d2fa7ae96df3b1b961239a7d39d074))
* **front:** fix mappadding bug on android ([fad5584](https://github.com/agrc/roadkill-mobile/commit/fad558421ba0d94c3d35d735f8d346ab54d99732))
* **front:** fix tests ([1b008a5](https://github.com/agrc/roadkill-mobile/commit/1b008a5ec7d5a869416ee98121844efcd9e74eca))
* **front:** fix zoom in on open report on ios ([f01ab18](https://github.com/agrc/roadkill-mobile/commit/f01ab18eaf49712f6d7feca7d96efb63f4b1cded))
* **front:** get crosshair point coords directly from map component ([f59604c](https://github.com/agrc/roadkill-mobile/commit/f59604cb19d8c59c6094e3881a7d91df41568525))
* **front:** get rid of android scale hack and replace with new layer param ([843f4d4](https://github.com/agrc/roadkill-mobile/commit/843f4d494c433e19a2aeac90ce58b8063b2e9a01))
* **front:** handle first assistance prompt before granting permissions ([41359b9](https://github.com/agrc/roadkill-mobile/commit/41359b9da0b941e28017e318f5607c9dc1cd4444))
* **front:** lower image quality and increase api request timeout ([3d92008](https://github.com/agrc/roadkill-mobile/commit/3d9200869ec94e08aa5ecb723624b78479de041b)), closes [#170](https://github.com/agrc/roadkill-mobile/issues/170)
* **front:** prevent duplicate list item key entries ([7e9da1a](https://github.com/agrc/roadkill-mobile/commit/7e9da1a72c5dcd5b3910519767baaace2b1acd16))
* **front:** query psap on new report opened ([dcc9053](https://github.com/agrc/roadkill-mobile/commit/dcc9053c3059f2d99f6eaa038f2a63549fddccbf)), closes [#165](https://github.com/agrc/roadkill-mobile/issues/165)
* **front:** remove un-pressable icons ([cf708ba](https://github.com/agrc/roadkill-mobile/commit/cf708babd5c36a2e9703a016774e4a4184fe5a8a)), closes [#155](https://github.com/agrc/roadkill-mobile/issues/155)
* **front:** set better zoom for static maps on iOS ([33bb369](https://github.com/agrc/roadkill-mobile/commit/33bb3695d408b9f1e7e329b65e7191e35206cd86))
* **front:** simplify crosshair placement ([47b91a8](https://github.com/agrc/roadkill-mobile/commit/47b91a80cfb003173349a772f83cf0b937d75311))
* **front:** standardize map tile resampling ([4572601](https://github.com/agrc/roadkill-mobile/commit/4572601e797205f5dc50e3592d1cd22738b0631d))
* **front:** update background permissions disclosure ([561f83a](https://github.com/agrc/roadkill-mobile/commit/561f83a89ec24cad0f42cf62a6a78eca9b0a7114))
* separate quad words between app and website ([a587013](https://github.com/agrc/roadkill-mobile/commit/a587013135989a16e384b5d8e41dc6ccd2a43189))


### Features

* **back:** finish implementing registration notification system ([f3b9bb8](https://github.com/agrc/roadkill-mobile/commit/f3b9bb82d1d7bed9e50457ac5481846cd63bceaa)), closes [#82](https://github.com/agrc/roadkill-mobile/issues/82)
* **back:** send user approve/reject notification emails ([1e01d9e](https://github.com/agrc/roadkill-mobile/commit/1e01d9ef83f8c12b5b03a0143cea77eae9ef7417)), closes [#173](https://github.com/agrc/roadkill-mobile/issues/173)
* **front:** add number of in-app offline notifications ([9bcc102](https://github.com/agrc/roadkill-mobile/commit/9bcc102d68d97471f40f7d3a6458eb8b6f639a22)), closes [#79](https://github.com/agrc/roadkill-mobile/issues/79)
* **front:** cache visited map tiles for offline use ([72075a8](https://github.com/agrc/roadkill-mobile/commit/72075a855dd3ea2dc8117c22248828670ffda6df)), closes [#29](https://github.com/agrc/roadkill-mobile/issues/29)
* **front:** display offline route submissions ([f1f3b10](https://github.com/agrc/roadkill-mobile/commit/f1f3b10ed8152ded276f365c2de8c9974094f2f0)), closes [#28](https://github.com/agrc/roadkill-mobile/issues/28)
* **front:** show registration message to non-public users ([d26f3c2](https://github.com/agrc/roadkill-mobile/commit/d26f3c27925b745308bd252ce595dd2437be59dc)), closes [#174](https://github.com/agrc/roadkill-mobile/issues/174)
* **front:** store reports offline if no network is available ([47920a5](https://github.com/agrc/roadkill-mobile/commit/47920a55523bfebe8b235e7b3528841347064370))
* **front:** store routes offline ([a8f542e](https://github.com/agrc/roadkill-mobile/commit/a8f542ee965d349e5ece0d682161be4f8b014af0)), closes [#28](https://github.com/agrc/roadkill-mobile/issues/28)
* **front:** submit offline reports manually or automatically ([f4226ae](https://github.com/agrc/roadkill-mobile/commit/f4226ae4d7bc5e515a89801cbd9e96529cc9a0d6)), closes [#28](https://github.com/agrc/roadkill-mobile/issues/28)
* implement delete account function ([cfcf12b](https://github.com/agrc/roadkill-mobile/commit/cfcf12be64a6222e95e858deb0683f40c531223e)), closes [#115](https://github.com/agrc/roadkill-mobile/issues/115)



# [v3.0.0-526](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-525...v3.0.0-526) (2022-03-08)


### Bug Fixes

* **back:** fix sql instance name format and make secret ([d8e2ada](https://github.com/agrc/roadkill-mobile/commit/d8e2ada39dcf5c67b69427546ba2e298ade1b1a4))
* **back:** fix thumb endpoint resizing ([0b348f2](https://github.com/agrc/roadkill-mobile/commit/0b348f2125b979b210f5413c19946896185a5bd0))
* **back:** handle bad photo ids ([5b8185e](https://github.com/agrc/roadkill-mobile/commit/5b8185e09ae4555778d5e78061a15295aba3b8d7))
* **back:** move secrets from env vars to gcp secret manager ([9eec165](https://github.com/agrc/roadkill-mobile/commit/9eec165255d2a66ea334c076c51e4874b357e865))
* **back:** sort and add environment var ([8fd7867](https://github.com/agrc/roadkill-mobile/commit/8fd78670dd428befe25f2663ef4a6365f7e45ca4)), closes [#119](https://github.com/agrc/roadkill-mobile/issues/119)
* fix prod dns ([3fb827f](https://github.com/agrc/roadkill-mobile/commit/3fb827f17113a6ae7f314eb47388de66174b9cb3))
* **front:** add dev and staging oauth client ids ([ca74e3e](https://github.com/agrc/roadkill-mobile/commit/ca74e3e5b1e939f3dfcb02d18bc1351f3ed9b622))
* **front:** add dev-specific app name ([d225465](https://github.com/agrc/roadkill-mobile/commit/d225465034f756a7657c15b02b332598b8299859))
* **front:** add missing dev env var ([7f87ea9](https://github.com/agrc/roadkill-mobile/commit/7f87ea948841234271258dd4834851ae097578a2)), closes [#152](https://github.com/agrc/roadkill-mobile/issues/152)
* **front:** create android icons for staging and development ([b08a0f4](https://github.com/agrc/roadkill-mobile/commit/b08a0f4b199e7367eb31a128f1f6270b0d2d88e4)), closes [#152](https://github.com/agrc/roadkill-mobile/issues/152)
* **front:** handle psap query when no recent location is available ([533659c](https://github.com/agrc/roadkill-mobile/commit/533659c0937ce6af67858790c989f0518ab599cf))
* **front:** move key to containing view to get rid of react warning ([ab16e86](https://github.com/agrc/roadkill-mobile/commit/ab16e86af45a429b002c2e064c0edbce30f5063a))
* **front:** pop background permissions warning on both ios and android ([b58ee7d](https://github.com/agrc/roadkill-mobile/commit/b58ee7db04210de723b689f4a6177a992a1cbdc9)), closes [#169](https://github.com/agrc/roadkill-mobile/issues/169)
* **website:** run normal npm i ([787cfd3](https://github.com/agrc/roadkill-mobile/commit/787cfd3393b7b7fe87f721caf892a5d92f1445d2))


### Features

* add notifications for public reports ([1e9d355](https://github.com/agrc/roadkill-mobile/commit/1e9d35599dde139ae2582ce8e1ad636ec5da0dd3)), closes [#35](https://github.com/agrc/roadkill-mobile/issues/35)
* add organization drop downs ([09c7dab](https://github.com/agrc/roadkill-mobile/commit/09c7dab4cfd599f25d75647fa6b70967aa71aec3)), closes [#80](https://github.com/agrc/roadkill-mobile/issues/80)
* **back:** implement database migrations ([6879273](https://github.com/agrc/roadkill-mobile/commit/6879273c3d9d03c88dcaa05a457d5ed8a10edd18)), closes [#68](https://github.com/agrc/roadkill-mobile/issues/68)
* **front:** create dev and staging apps ([c624de2](https://github.com/agrc/roadkill-mobile/commit/c624de29c0e117ad710af32a0880d0adab13d294)), closes [#152](https://github.com/agrc/roadkill-mobile/issues/152)



# [v3.0.0-525](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-524...v3.0.0-525) (2022-02-15)


### Bug Fixes

* **front:** fix spinner layout on android ([c82c8fa](https://github.com/agrc/roadkill-mobile/commit/c82c8fa9ea40dfe7ddd288e61feaf1f036e7a57c)), closes [#156](https://github.com/agrc/roadkill-mobile/issues/156)
* **front:** make background location dialog more compliant for google play ([1e5783a](https://github.com/agrc/roadkill-mobile/commit/1e5783abdd9ca25c19ce70c86385f2f4d737eefb)), closes [#157](https://github.com/agrc/roadkill-mobile/issues/157)


### Features

* add routes to My Reports screen ([81b7c90](https://github.com/agrc/roadkill-mobile/commit/81b7c902861286e9e84c8b2a62697af92d69b529)), closes [#154](https://github.com/agrc/roadkill-mobile/issues/154)
* query PSAPs for live animal phone number ([e9c55fa](https://github.com/agrc/roadkill-mobile/commit/e9c55fa7ccbe8ab5a304a95c6b92eff73c08da02)), closes [#107](https://github.com/agrc/roadkill-mobile/issues/107)



# [v3.0.0-524](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-522...v3.0.0-524) (2022-02-11)


### Bug Fixes

* **back:** handle facebook id vs sub ([1d4ccec](https://github.com/agrc/roadkill-mobile/commit/1d4ccec4d563134e6593c181cfb02ea710c42ab1))
* **data:** create routes table before it is referenced ([fe56d18](https://github.com/agrc/roadkill-mobile/commit/fe56d1850019845314e14d7982add24abd340768))
* **front:** add background location to permissions ([b6457ed](https://github.com/agrc/roadkill-mobile/commit/b6457ed407a53d91e134ce1d5c4442ad07dae931))
* **front:** better accuracy and remove deferred updates ([35055ff](https://github.com/agrc/roadkill-mobile/commit/35055ff98d68cd9e0a170a40fb814ff291e42689))
* **front:** fix analytics crash on sims ([abcc05d](https://github.com/agrc/roadkill-mobile/commit/abcc05d9369de2a4d0e902f9cd24f7f250d1e56b))
* **front:** fix org name in sentry ([6ea4acc](https://github.com/agrc/roadkill-mobile/commit/6ea4acc5add3e505fc44416d6f9f5797e88d3625))
* **front:** fix utahid oauth flow on android ([972d6da](https://github.com/agrc/roadkill-mobile/commit/972d6da553e227b7c4786685a0f71723e0ecfa3e))
* **front:** handle issues with reading secure storage on android ([6b23dfe](https://github.com/agrc/roadkill-mobile/commit/6b23dfe6dca0247d72172a2e73c802fe37037df5))
* **front:** lazy load constants json ([b43b69c](https://github.com/agrc/roadkill-mobile/commit/b43b69c4f221fd0fc2f21ee5f6b6fea8bc2af35c))


# [v3.0.0-523](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-520...v3.0.0-522) (2022-01-24)


### Bug Fixes

* **back:** fix facebook login ([29ee5f1](https://github.com/agrc/roadkill-mobile/commit/29ee5f18fb6827617483bf23d06a0e452564298d))
* **back:** increase payload size limits ([ad59226](https://github.com/agrc/roadkill-mobile/commit/ad59226dfbd729799f985e8a891dafd738db1b07))
* fix bug causing issues with app switching and location ([08880b8](https://github.com/agrc/roadkill-mobile/commit/08880b8eb71839b628168e98f3b30f39e13fee69))
* **front:** fix new image capture on android ([5155e70](https://github.com/agrc/roadkill-mobile/commit/5155e7088d5ef75a3a13e5f07e1b6af9da358949)), closes [/github.com/expo/expo/issues/15119#issuecomment-1000268968](https://github.com//github.com/expo/expo/issues/15119/issues/issuecomment-1000268968)
* **front:** remove get location on app state change ([d15be7b](https://github.com/agrc/roadkill-mobile/commit/d15be7b53797e1031ca7ed903853d5b34f13a68a))
* **front:** update map button colors to be closer to latest mockups ([da2d5f7](https://github.com/agrc/roadkill-mobile/commit/da2d5f7df5ec450a7fd1022107b704b6418f5288))
* make crosshair icon show more reliably ([353b834](https://github.com/agrc/roadkill-mobile/commit/353b834dcd25760516958c9148fee3f4d74f6bda)), closes [#117](https://github.com/agrc/roadkill-mobile/issues/117)


### Features

* backup vehicle tracking to local storage ([6856cdb](https://github.com/agrc/roadkill-mobile/commit/6856cdb1e001728e611c4c59899ffddcaedf66c7)), closes [#31](https://github.com/agrc/roadkill-mobile/issues/31)
* **front:** pause route tracking if longer than 12 hours ([3717186](https://github.com/agrc/roadkill-mobile/commit/3717186a6a6589b57a9084e85305ab410b0966ca)), closes [#31](https://github.com/agrc/roadkill-mobile/issues/31)
* **front:** upgrade to Hermes JS engine ([7cf37a4](https://github.com/agrc/roadkill-mobile/commit/7cf37a49f313ccaebb5e753fa5a1f620689962fa))
* record pickups as part of vehicle route ([0634cd2](https://github.com/agrc/roadkill-mobile/commit/0634cd2dec0d39bb02003174e68dc5039bba9402)), closes [#31](https://github.com/agrc/roadkill-mobile/issues/31)
* submit routes and associated pickups ([4b68f79](https://github.com/agrc/roadkill-mobile/commit/4b68f7985bee388fcf7ba80ac2e97875fcd38a07)), closes [#31](https://github.com/agrc/roadkill-mobile/issues/31)



# [v3.0.0-520](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-515...v3.0.0-520) (2021-12-09)


### Bug Fixes

* **front:** better identification image performance ([ac2aac0](https://github.com/agrc/roadkill-mobile/commit/ac2aac01db3841cb2d25c977ebe1cac6897df4ab))
* **front:** fix padding on selected list item ([ce9a7be](https://github.com/agrc/roadkill-mobile/commit/ce9a7beee7cd0b7027a85eb5e4c7ba3d032f2ef5))


### Features

* **back:** implement identification images api ([d3a6546](https://github.com/agrc/roadkill-mobile/commit/d3a654641590e80e0ac63d2519c11342c7f31d3f)), closes [#63](https://github.com/agrc/roadkill-mobile/issues/63)



# [v3.0.0-515](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-487...v3.0.0-515) (2021-12-01)


### Bug Fixes

* **back:** don't cache user info for unapproved users ([bc7d694](https://github.com/agrc/roadkill-mobile/commit/bc7d694ed924cabb0ada84126b7dd475627bc1cb))
* **data:** add unknown values to species types ([4a50993](https://github.com/agrc/roadkill-mobile/commit/4a50993deda804ded7118d3520f8d5ac2afb5017))
* disable sendgrid click tracking ([21e38f5](https://github.com/agrc/roadkill-mobile/commit/21e38f52864239cd57512eab4aeeafc87bcfa522))
* **front:** fix bug preventing multiple changes to profile data ([1d44724](https://github.com/agrc/roadkill-mobile/commit/1d4472479fcd7035e3ce4cfe8c317f01bc9d9bbe)), closes [#150](https://github.com/agrc/roadkill-mobile/issues/150)
* **front:** fix my reports and report info after species fields additions ([6d62717](https://github.com/agrc/roadkill-mobile/commit/6d6271723d4f7e7910c966028c5e49318efef65a))
* **front:** handle un-approved user profiles ([c8bc2f5](https://github.com/agrc/roadkill-mobile/commit/c8bc2f5266e57c9892b39921e569ef35869926d9))
* **front:** make sure that initial form dates are set ([b8fae4e](https://github.com/agrc/roadkill-mobile/commit/b8fae4ebf10cfe18763bd635320877b4a7e039d6))
* **front:** prevent accidental toggling of repeat submission switch while scrolling report form ([5311808](https://github.com/agrc/roadkill-mobile/commit/53118080adc9a8ed2dcc94cc428fc84a4a2fd914))
* **front:** prevent species change from resetting other form values ([7d77936](https://github.com/agrc/roadkill-mobile/commit/7d77936b9df3b79a9b215eee5fcb62ac8cc2ceec))


### Features

* add species table and related fields to report_info ([bcf1777](https://github.com/agrc/roadkill-mobile/commit/bcf17779c5570cc292d87ec8098337274fe455e4)), closes [#135](https://github.com/agrc/roadkill-mobile/issues/135)
* **front:** add placeholder images for species search items ([40d5662](https://github.com/agrc/roadkill-mobile/commit/40d56625794197f3b70317f4884727cd2cdafd5b)), closes [#63](https://github.com/agrc/roadkill-mobile/issues/63)
* **front:** add rare species warning ([0f82b7e](https://github.com/agrc/roadkill-mobile/commit/0f82b7e801ee88f00a734e9c95b76f1cfa0247b3)), closes [#148](https://github.com/agrc/roadkill-mobile/issues/148)
* **front:** make sure that status bar is visible in dark mode ([008a4ce](https://github.com/agrc/roadkill-mobile/commit/008a4ced596a46c232350fdf3ee7cfad76a3c51c))
* implement constants system to initially house species data ([1b8eb0b](https://github.com/agrc/roadkill-mobile/commit/1b8eb0bffb7dd04d363a45f839a599c88c859be9)), closes [#135](https://github.com/agrc/roadkill-mobile/issues/135)



# [v3.0.0-487](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-453...v3.0.0-487) (2021-11-19)


### Bug Fixes

* **front:** adjust photo date for current timezone on device ([9d3ca38](https://github.com/agrc/roadkill-mobile/commit/9d3ca3896b3b170fadbe3f3cb0f412eef7424bc1))
* **front:** permission name typo ([00a03c6](https://github.com/agrc/roadkill-mobile/commit/00a03c617d9e2dc5350d6b684e9dfad0aa82d7d8))
* make sure that we always have a fresh version of the current auth provider ([f9a83e1](https://github.com/agrc/roadkill-mobile/commit/f9a83e12c821bc4b1fb8f63d77f70ef3c8bd90f5)), closes [#111](https://github.com/agrc/roadkill-mobile/issues/111)
* remove unused map prop and add altitude ([4d736cb](https://github.com/agrc/roadkill-mobile/commit/4d736cb999017a0ab26daae8d2faaaa97b9c3905))
* remove welcome page ([69018f8](https://github.com/agrc/roadkill-mobile/commit/69018f8dce864b473f16d908362275f4e4e78a04)), closes [#121](https://github.com/agrc/roadkill-mobile/issues/121)
* simplify text for public choice ([5b73a54](https://github.com/agrc/roadkill-mobile/commit/5b73a54cd2d69178b02fe0b1cc7b73310790809c)), closes [#120](https://github.com/agrc/roadkill-mobile/issues/120)
* true/false -> yes/no for repeat submission value ([f83ab1a](https://github.com/agrc/roadkill-mobile/commit/f83ab1a7a784d16b7d0d7304be77f98d0d050d93)), closes [#140](https://github.com/agrc/roadkill-mobile/issues/140)


### Features

* add check to make sure that location services are turned on ([26c7b06](https://github.com/agrc/roadkill-mobile/commit/26c7b06e25f9c8ae3594001b73e41cc30fc8a4bd))
* conditionally hide age & sex components ([cca2601](https://github.com/agrc/roadkill-mobile/commit/cca2601a82a7f0e25f96bb104af62b41feded674)), closes [#138](https://github.com/agrc/roadkill-mobile/issues/138)
* implement profile screen ([66037c8](https://github.com/agrc/roadkill-mobile/commit/66037c8784b2c01c1b3b54b042a0c587a4c5c46b)), closes [#73](https://github.com/agrc/roadkill-mobile/issues/73)



# [v3.0.0-453](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-451...v3.0.0-453) (2021-11-01)


### Features

* **front:** refine app icons, splashscreen and app text ([b728812](https://github.com/agrc/roadkill-mobile/commit/b7288126529df842212b289c716ad6f3fcb174d7)), closes [#114](https://github.com/agrc/roadkill-mobile/issues/114)



# [v3.0.0-451](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-436...v3.0.0-451) (2021-10-29)


### Bug Fixes

* check for access not refresh token ([584911c](https://github.com/agrc/roadkill-mobile/commit/584911c39e82de1ba2e497351e4d52701f33b3c0))
* fix bug preventing utahid auth via authenticator app ([e4dde2c](https://github.com/agrc/roadkill-mobile/commit/e4dde2c0d502ab93ed944635df8dc9273e211695)), closes [#112](https://github.com/agrc/roadkill-mobile/issues/112) [#76](https://github.com/agrc/roadkill-mobile/issues/76)
* make photo date not required ([0aa6586](https://github.com/agrc/roadkill-mobile/commit/0aa6586c10a1ee41dbd954eae9ff5db91bc22c34))


### Features

* add custom icon and splash screen ([59e5855](https://github.com/agrc/roadkill-mobile/commit/59e58553d8df9ecd3f6c48b6965f7656396add4f)), closes [#114](https://github.com/agrc/roadkill-mobile/issues/114)
* basic my reports list ([756bcb1](https://github.com/agrc/roadkill-mobile/commit/756bcb17cb41ddf5c05f4254015b10748c1d3b26)), closes [#78](https://github.com/agrc/roadkill-mobile/issues/78)
* implement report info screen ([f784fb9](https://github.com/agrc/roadkill-mobile/commit/f784fb95cf75a7d55368ca81113589ba7ec2a413))



# [v3.0.0-436](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-412...v3.0.0-436) (2021-10-19)


### Bug Fixes

* add missing export for facebook provider ([e722c16](https://github.com/agrc/roadkill-mobile/commit/e722c1692185c3fc7f17fabd9c680f9f90db06c4))
* add storybook package to help with missing dep ([a696f99](https://github.com/agrc/roadkill-mobile/commit/a696f99576836098d43153bb85d42bffbbef4d99))
* check for valid token before attempting to hit logout endpoint ([9e7df30](https://github.com/agrc/roadkill-mobile/commit/9e7df30a449be87cfa9fc453d7a9f9e13b4d292b))
* close keyboard on report form close ([cea1972](https://github.com/agrc/roadkill-mobile/commit/cea1972b666d02b968c33fe2b4995deab9550878))
* fix bug causing double log in prompt on submit ([d28e1e5](https://github.com/agrc/roadkill-mobile/commit/d28e1e5a42cb597e45085379b3220b736cfe4075)), closes [#110](https://github.com/agrc/roadkill-mobile/issues/110)
* increase post report timeout ([1b3777e](https://github.com/agrc/roadkill-mobile/commit/1b3777e0a9375c3dd34f7546c39945893930e467))
* add loading text to app if auth is not ready ([3eb1e57](https://github.com/agrc/roadkill-mobile/commit/3eb1e57b6777e2a6533d4bfa779559ff03eace2f))
* implement species component ([a694e9d](https://github.com/agrc/roadkill-mobile/commit/a694e9d1e35b6be44e0a15ddc246960a163e23c8)), closes [#98](https://github.com/agrc/roadkill-mobile/issues/98)


### Features

* add comments component ([89a98b2](https://github.com/agrc/roadkill-mobile/commit/89a98b22025db8884a72588982739245b4ba61ff)), closes [#101](https://github.com/agrc/roadkill-mobile/issues/101)
* add proper logout ([e05f3d7](https://github.com/agrc/roadkill-mobile/commit/e05f3d7a612ac82ed0b3e09f0c2c164d4eb649f5)), closes [#108](https://github.com/agrc/roadkill-mobile/issues/108)
* implement age_class & sex components ([592084b](https://github.com/agrc/roadkill-mobile/commit/592084b3c1a40ea12dcc6bce18dd5516bdda5e81)), closes [#99](https://github.com/agrc/roadkill-mobile/issues/99)
* implement discover/pickup date component ([210da0f](https://github.com/agrc/roadkill-mobile/commit/210da0f0f17a068c5098f419a1bda9ba8165bc10)), closes [#100](https://github.com/agrc/roadkill-mobile/issues/100)


# [v3.0.0-412](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-372...v3.0.0-412) (2021-09-27)


### Bug Fixes

* **front:** better icon size management ([f515277](https://github.com/agrc/roadkill-mobile/commit/f515277a72398a7b1aaf0441cd3eeb780f857500))
* **front:** better management of tokens for utahid provider ([e0840e2](https://github.com/agrc/roadkill-mobile/commit/e0840e233c220ade4408df049c751f624e43befe))


### Features

* **back:** better error message when no token is passed ([26ab6ba](https://github.com/agrc/roadkill-mobile/commit/26ab6ba1d48421ba73c097d1ab120226c9431220))
* **back:** minimal implementation of new report endpoints ([b3cd66a](https://github.com/agrc/roadkill-mobile/commit/b3cd66ab2bb057f617121020333bf54462c5bfaa)), closes [#103](https://github.com/agrc/roadkill-mobile/issues/103) [#104](https://github.com/agrc/roadkill-mobile/issues/104)
* **front:** add repeat submission component ([c6087f4](https://github.com/agrc/roadkill-mobile/commit/c6087f46bc815bc66d9ef32d9ea945ec8b066845)), closes [#96](https://github.com/agrc/roadkill-mobile/issues/96)
* **front:** handle different report scenario based on role ([180d935](https://github.com/agrc/roadkill-mobile/commit/180d935631fd4a93ae6ee557adf5657b8dfd292f)), closes [#95](https://github.com/agrc/roadkill-mobile/issues/95)
* **front:** implement capture photo component ([ae80432](https://github.com/agrc/roadkill-mobile/commit/ae804324b244480844605f4b554c0c364c6e9239)), closes [#97](https://github.com/agrc/roadkill-mobile/issues/97)
* **front:** submit reports to backend ([c2417e9](https://github.com/agrc/roadkill-mobile/commit/c2417e96ddc50f3cc51b7d975c77b7e04a26bc87))



# [v3.0.0-372](https://github.com/agrc/roadkill-mobile/compare/v3.0.0-362...v3.0.0-372) (2021-09-10)

### Bug Fixes

- **front:** better release channel management ([5431b75](https://github.com/agrc/roadkill-mobile/commit/5431b750758361b1851d4384231dbc17ce1fd6ad))
- **front:** pass name from standalone google provider ([c2cd6cf](https://github.com/agrc/roadkill-mobile/commit/c2cd6cf0f56e9b3063d46caea4e1c317fb9ed13e)), closes [#105](https://github.com/agrc/roadkill-mobile/issues/105)
- **front:** typo ([44dfdcf](https://github.com/agrc/roadkill-mobile/commit/44dfdcff159d51e6509fa4f698d984c6add7d289))

# [v3.0.0 (362)](https://github.com/agrc/roadkill-mobile/compare/v2.0.4...v) (2021-09-08)

### Bug Fixes

- account for auto exchange of code ([9060b21](https://github.com/agrc/roadkill-mobile/commit/9060b21f3ee02c21f6449d8dd030f15242f1bab5))
- add environment-specific value for db host ([4e0e3bf](https://github.com/agrc/roadkill-mobile/commit/4e0e3bfdcffc978ff30476c1eeef7ea8904d446a))
- add FB env variable to GHA deploy ([adf00fb](https://github.com/agrc/roadkill-mobile/commit/adf00fb033925e1a044b1fe673a62bd4642402a5))
- add missing env vars to GHA expo publish ([8764c17](https://github.com/agrc/roadkill-mobile/commit/8764c17b6e977d01d1bbea8edfbb0b47750f1dc2))
- add missing sentry import ([909ff77](https://github.com/agrc/roadkill-mobile/commit/909ff7775a6b6d0b52e4b0d1367de9eeae74e281))
- add name to npm package ([494b22d](https://github.com/agrc/roadkill-mobile/commit/494b22d643e1bcaefd6cc21119af301eb894464f))
- add try/catch to exchange request ([178ed6b](https://github.com/agrc/roadkill-mobile/commit/178ed6b4960f5fb267fb68a8b6b080db0fb8bcea))
- add try/catch to facebook user request ([20e676b](https://github.com/agrc/roadkill-mobile/commit/20e676bd432511af2c583d4f420222b82519da61))
- add try/catch to google fetch userinfo ([d7711b1](https://github.com/agrc/roadkill-mobile/commit/d7711b16b9b16cf211a16c3d10c17ef9e4ec4c8b))
- add uses encryption value for apple app store ([b72a758](https://github.com/agrc/roadkill-mobile/commit/b72a758a1931f1c7e417861a1615c4a1a49d3675))
- allow for firestore emulation in tests ([ad49a9d](https://github.com/agrc/roadkill-mobile/commit/ad49a9d2639b090b19620b763907097e9608cb4a))
- another attempt at logging ([759df74](https://github.com/agrc/roadkill-mobile/commit/759df746bb907519337f0286d22310d415891a8d))
- **back:** add gcloud to action ([5871f31](https://github.com/agrc/roadkill-mobile/commit/5871f310fe9f3f7849711a2fbb8636b42082fae0))
- **back:** add project id ([1ca800e](https://github.com/agrc/roadkill-mobile/commit/1ca800edaf1c2b29658bec44b0dd8c1a6d3ca2cd))
- **back:** another attempt at passing param ([ef42644](https://github.com/agrc/roadkill-mobile/commit/ef42644b3573e4ef4673202c4f646ae4c1531dbf))
- **back:** another try and deploy command ([3165c87](https://github.com/agrc/roadkill-mobile/commit/3165c875b687a14bb15f060539749d0b901ceb7a))
- **back:** auto-shutdown firestore emulator in ci tests ([b4d4076](https://github.com/agrc/roadkill-mobile/commit/b4d407610e6b359b4e9b01a3fb80b6a96cfbb480))
- **back:** better names ([83b94e6](https://github.com/agrc/roadkill-mobile/commit/83b94e694ff7c86842f787b359abb4a381319bbc))
- **back:** better token params validation tests ([fdb23bc](https://github.com/agrc/roadkill-mobile/commit/fdb23bcc8428ed1680b637169a21ffa0ed851026))
- **back:** don't log to gcp in test or development ([4a5916e](https://github.com/agrc/roadkill-mobile/commit/4a5916e2f6e44298cc4a1c7aa604783b65cd0343))
- **back:** fix deploy command syntax ([87a3afc](https://github.com/agrc/roadkill-mobile/commit/87a3afca3f5c16272cdcfbf927a9c09ff68ebcc3))
- **back:** force got to retry introspect requests ([a0a7e2b](https://github.com/agrc/roadkill-mobile/commit/a0a7e2b4bd8c8920e0ad18e3bcc4d44aac0c1890))
- **back:** handle null org ([a692a41](https://github.com/agrc/roadkill-mobile/commit/a692a41eaf3d8143adce4863e41e01f83d4c46a6))
- **back:** ignore firebase & firestore logs ([f581c09](https://github.com/agrc/roadkill-mobile/commit/f581c09179c02679e29c2f8ee6e14df5e4a5377d))
- **back:** install command ([aab4930](https://github.com/agrc/roadkill-mobile/commit/aab493010e73f525e3dbdbd3374dfce2aef98258))
- **back:** install emulator ([e25f735](https://github.com/agrc/roadkill-mobile/commit/e25f7359f2c008f20a7b7ca74b2868af35bd0316))
- **back:** install gcloud beta components ([50ffa90](https://github.com/agrc/roadkill-mobile/commit/50ffa90954c1cd7288d3332485865f1e5cf2be89))
- **back:** last ditch effort on deploy command ([751fe6d](https://github.com/agrc/roadkill-mobile/commit/751fe6df4742bbc24160c0f4c962d580d52b2429))
- **back:** move env var from action to .env.test ([6c7aa1d](https://github.com/agrc/roadkill-mobile/commit/6c7aa1d25582e953150c8da6f5bf7e4fc624e733))
- **back:** on reject set approved to false ([ff81328](https://github.com/agrc/roadkill-mobile/commit/ff813288f141a7986f84989ee3dcd692e1a97ac4))
- **back:** pass environment to email ([a853ae2](https://github.com/agrc/roadkill-mobile/commit/a853ae27f006c34042d012172cf02b6f8d754459))
- **back:** pass test env vars to jest ([40078ba](https://github.com/agrc/roadkill-mobile/commit/40078bac10b6c3ed03da619e288ca1f310f2d627))
- **back:** remove superfluous jest config ([559b26f](https://github.com/agrc/roadkill-mobile/commit/559b26f10f7afef19eb8a661c03061d23c1382a3))
- **back:** separate validation for auth and refresh token requests ([8553dc0](https://github.com/agrc/roadkill-mobile/commit/8553dc09cabfa88235672994ebceb5ea02db8e85))
- **back:** set approved to null when registering ([853c907](https://github.com/agrc/roadkill-mobile/commit/853c907f52837859bc5428603da79945ebe26105))
- **back:** simplify env vars/secrets ([3cfc2e9](https://github.com/agrc/roadkill-mobile/commit/3cfc2e964012bb1d4c1c467edda34f41618b7007))
- **back:** switch to firebase firestore emulator ([f4983e3](https://github.com/agrc/roadkill-mobile/commit/f4983e3e1af5fc61158501ac93bd603b6a66b867))
- **back:** switch to multiple params for env vars ([7d03afc](https://github.com/agrc/roadkill-mobile/commit/7d03afce393c3aa958e1a6727c69867697b0a223))
- **back:** try different imports ([1b190e8](https://github.com/agrc/roadkill-mobile/commit/1b190e80d8f89dccb5a9fe47991aa5ec77a494d5))
- **back:** try folded block scaler ([5d21e66](https://github.com/agrc/roadkill-mobile/commit/5d21e669a4817a40ec6e083d4d2ab15ed9c3a8e6))
- **back:** update docker file start command ([4963072](https://github.com/agrc/roadkill-mobile/commit/4963072203cd4bdbd1dee26e5107fcb5eaf4483e))
- **back:** use correct status code for bad request ([da8bb5c](https://github.com/agrc/roadkill-mobile/commit/da8bb5c1b70602e781bdd033fe5efb54ca5a2e3a))
- **back:** use firestore emulator ([8546404](https://github.com/agrc/roadkill-mobile/commit/85464044576d4e5adff7d1b57c41220c8321c98f))
- **back:** yml syntax ([67380b9](https://github.com/agrc/roadkill-mobile/commit/67380b913fd19f3b056dc5f67f7a6768fb9ca35e))
- better error checking with initial login ([eef5aad](https://github.com/agrc/roadkill-mobile/commit/eef5aada266d982d73b0e09bc3eb748762316d67))
- better name ([5463772](https://github.com/agrc/roadkill-mobile/commit/546377262eecfce1d323fe9c5148f3833369cedd))
- better sub folder name ([3c2e422](https://github.com/agrc/roadkill-mobile/commit/3c2e422c6688bf8a3ce068a260a5a4452654ea31))
- check for expired token on app load ([9c563f9](https://github.com/agrc/roadkill-mobile/commit/9c563f9772a26bd0dbc531ed9d472eba40dcccfb))
- create test env ([72b50e4](https://github.com/agrc/roadkill-mobile/commit/72b50e46057baf9e2cefa64decd00d9e12e51e7b))
- **db:** approved should be nullable and not false by default ([98c1edd](https://github.com/agrc/roadkill-mobile/commit/98c1edd94a0c92c23d2bd5faa0eed2695cc779f8))
- don't return a promise in an effect ([aba5841](https://github.com/agrc/roadkill-mobile/commit/aba5841dbd3f2653ad7e4e2a8fb7a5f947d15b22))
- downgrade auth session ([ce149ac](https://github.com/agrc/roadkill-mobile/commit/ce149accb413e78856adde8a77ebec56c81ae5a2))
- enable hitting local api from physical device ([921ef87](https://github.com/agrc/roadkill-mobile/commit/921ef871351b761c79c940ce38fd1075b1c15c63))
- fix connection to database from gcp ([3439628](https://github.com/agrc/roadkill-mobile/commit/3439628731ec99c7612b1cd624249056034f93f7))
- force auto exchange for google in standalone ([a84523c](https://github.com/agrc/roadkill-mobile/commit/a84523c44d283113ae63295c0e0d1cb6ed1cd9f6))
- **front:** add dep required for cli publish ([1482d48](https://github.com/agrc/roadkill-mobile/commit/1482d483e22f39a66916ffd1650e845750c688c4))
- **front:** add distance interval ([8b3c700](https://github.com/agrc/roadkill-mobile/commit/8b3c7007f21fc109f732966d89056f7e58ba5e36))
- **front:** add google default redirect as alias ([8a93c9f](https://github.com/agrc/roadkill-mobile/commit/8a93c9fcf6e97e76cb1f0d0d04e9bcc949a342ef))
- **front:** add home to redirect URL ([cbd1448](https://github.com/agrc/roadkill-mobile/commit/cbd14480a7a4cba33d603c39623815af7a569f2a))
- **front:** add map padding for ios devices ([7f660b5](https://github.com/agrc/roadkill-mobile/commit/7f660b52cbfbb2fa873a35220db5df2bee3d1c3b))
- **front:** add secrets as env vars ([da9bd36](https://github.com/agrc/roadkill-mobile/commit/da9bd366eb3eb2b6b514093c2333516e377227b8))
- **front:** add slash in dev mode ([c889dce](https://github.com/agrc/roadkill-mobile/commit/c889dcefb1c0fa4771fdae3f9d483b124e8bbec7))
- **front:** better component name ([ae2f11d](https://github.com/agrc/roadkill-mobile/commit/ae2f11d1542991d479043eda1fd5f70a345ee2c5))
- **front:** better error handling for google login ([b4cc85a](https://github.com/agrc/roadkill-mobile/commit/b4cc85a8c4d15469fcc25b1ef401acfa9bdea280))
- **front:** better handling of location issues ([d3ff6cf](https://github.com/agrc/roadkill-mobile/commit/d3ff6cf2c594570477badb2b1f3fb5838dfc42ea))
- **front:** better management of configs ([b86214b](https://github.com/agrc/roadkill-mobile/commit/b86214bef2a1bf6fc43fa50473db9b6d920fae2b))
- **front:** catch google and facebook dismiss fix up with utahid ([259d066](https://github.com/agrc/roadkill-mobile/commit/259d06653d21ef1d44e6d0b825f483a576014768))
- **front:** catch login error ([60f29eb](https://github.com/agrc/roadkill-mobile/commit/60f29eb927250d8df2b13e977fbbc55b092cd016))
- **front:** checkout all commits for correct build number ([c800228](https://github.com/agrc/roadkill-mobile/commit/c800228ec46546b245431a2eeca320ff301d2db1))
- **front:** clean up and solidify auth token requests ([c17345f](https://github.com/agrc/roadkill-mobile/commit/c17345fafa1113d39a2dc559c131a343af73100c))
- **front:** don't worry about expired oauth users ([e0bb615](https://github.com/agrc/roadkill-mobile/commit/e0bb615efd3be1b0235f856cd58316f955aa1575))
- **front:** fix bug causing incorrect view in report drawer ([537f7db](https://github.com/agrc/roadkill-mobile/commit/537f7db5600871c767d523854e676ad61d6c51e2))
- **front:** fix expo publish ([192f8c5](https://github.com/agrc/roadkill-mobile/commit/192f8c533771b519be79001163453167a95aa8bc))
- **front:** fix incorrect import ([f02247b](https://github.com/agrc/roadkill-mobile/commit/f02247b82444aeb30802d7bb06a2d851dcf15cbc))
- **front:** fix ky error in jest tests ([9c846a9](https://github.com/agrc/roadkill-mobile/commit/9c846a98397006f964337a8ebe94f3d4a4691fc4))
- **front:** fix plist file extension ([139169c](https://github.com/agrc/roadkill-mobile/commit/139169c8307d12f156d0bf5ca36dad7998ccb90d))
- **front:** fix promise ([b0282ba](https://github.com/agrc/roadkill-mobile/commit/b0282ba85407990dcf8a34c38facfddd9c747db0))
- **front:** fix secrets ([2c425fd](https://github.com/agrc/roadkill-mobile/commit/2c425fd207fee25027febfedc86ad3663f478b28))
- **front:** fix syntax in bash command ([d1e1aaf](https://github.com/agrc/roadkill-mobile/commit/d1e1aaf5c01eaaf65767494d1f2541dea6c2f359))
- **front:** fix variable name in error message ([a51c525](https://github.com/agrc/roadkill-mobile/commit/a51c525b86783344fdbb8bd029afc9983736854c))
- **front:** force auto exchange ([45dfaba](https://github.com/agrc/roadkill-mobile/commit/45dfabafe0c760c2a8bb5131885ffdfaf3f5283b))
- **front:** get appropriate local server host for emulators ([98aaf40](https://github.com/agrc/roadkill-mobile/commit/98aaf406d48110d1352b87740b18e35d64262b80))
- **front:** get scheme from manifest ([c99b2a4](https://github.com/agrc/roadkill-mobile/commit/c99b2a48aef332114152ac009afd162ecba324e6))
- **front:** handle dismiss oauth flows ([64ea0c3](https://github.com/agrc/roadkill-mobile/commit/64ea0c3d7d2f694f094e5d83e0e10e29d9e1ffc7))
- **front:** handle if there is no exchange ([2a9324e](https://github.com/agrc/roadkill-mobile/commit/2a9324ea3515bfb97141d4601726ae3f5e780d90))
- **front:** handle undefinted cached tokens ([f282209](https://github.com/agrc/roadkill-mobile/commit/f2822097ab3f8e1c1a37d0eb63544178c5fd30f3))
- **front:** make sure to go back to login screen on cancel ([2e7699b](https://github.com/agrc/roadkill-mobile/commit/2e7699b235de29bf775e0706ea5714b61b44edab))
- **front:** pan, don't zoom on location button ([7b5f007](https://github.com/agrc/roadkill-mobile/commit/7b5f007223eaf56ea77c7d46bc15fed7765f58df))
- **front:** prevent "false" in prod redirect url ([88f35b3](https://github.com/agrc/roadkill-mobile/commit/88f35b3c9730577cf9b0dd292b7382fbd8032bee))
- **front:** remove tag check from deploy steps ([e5cd1b9](https://github.com/agrc/roadkill-mobile/commit/e5cd1b90ca08d63dc2d9c338d2edbeaad23ae39a))
- **front:** restrict deploy steps to branch ([121d064](https://github.com/agrc/roadkill-mobile/commit/121d0640987f652d3bba62a17ce92295cf97e698))
- **front:** return promise ([c35683a](https://github.com/agrc/roadkill-mobile/commit/c35683a4e46e4cf6752aef0404847a645f4f9b1c))
- **front:** run dismiss after more important resets ([7a99994](https://github.com/agrc/roadkill-mobile/commit/7a99994405dc0474c3344d637c504a2738ed6950))
- **front:** set env vars in publish command ([4c2ee5e](https://github.com/agrc/roadkill-mobile/commit/4c2ee5efdd6103c0f998b5fa2adafb94076fd30d))
- **front:** set response type for google provider ([8c2068e](https://github.com/agrc/roadkill-mobile/commit/8c2068ec1e477c58812a55ee7b7d97058ef6c7da))
- **front:** show better login error info ([8787f38](https://github.com/agrc/roadkill-mobile/commit/8787f38444d5eff13cdfe5ef4805b3321bbaaf57))
- **front:** skip confirm alert when canceling registration ([55edf09](https://github.com/agrc/roadkill-mobile/commit/55edf09f6c51668396491259d809e8f6e93f41d4))
- **front:** support building in non-default branches ([156edc5](https://github.com/agrc/roadkill-mobile/commit/156edc5fe73b7f1cd5fa1f177da5b2d90a46f524))
- **front:** switch from fetch to ky ([4144d09](https://github.com/agrc/roadkill-mobile/commit/4144d09eaba6a5c7c92b58ebf5c3f31a8dd1342f))
- **front:** switch to more distinct my location icon ([838a92b](https://github.com/agrc/roadkill-mobile/commit/838a92b06e872787492ac142318c3b07e0144282))
- **front:** too many slashes ([9833b50](https://github.com/agrc/roadkill-mobile/commit/9833b50181826c9abbd3364d20129b9699d4be1c))
- **front:** try different place for logging redirectUri ([1d4e93a](https://github.com/agrc/roadkill-mobile/commit/1d4e93a99909ad14f2fee3c8a2d37e7a7ec3863a))
- **front:** try to handle android screen issues ([798d62d](https://github.com/agrc/roadkill-mobile/commit/798d62db8c8f8583d22d5041f9f330d988dd0212))
- **front:** turn off follow user faster ([555e691](https://github.com/agrc/roadkill-mobile/commit/555e691db93b0ac1dac87e75c36425f6970ff546))
- **front:** use expo auth proxy for dev ([7dae43c](https://github.com/agrc/roadkill-mobile/commit/7dae43caad80b86c6490e206ccc6e036b834073c))
- **front:** use text component from ui-kitten ([a457860](https://github.com/agrc/roadkill-mobile/commit/a457860754486510f714fa4866ee6bff6928c2cb))
- handle cancelled oauth flow ([f0a0fca](https://github.com/agrc/roadkill-mobile/commit/f0a0fcadb3ffced65ff78fccdd0ee6bb86fece57))
- handle google auth cancel better ([da27d2f](https://github.com/agrc/roadkill-mobile/commit/da27d2f214760a56ea40a4bb794030fd1d616c40))
- log google auth response ([701349a](https://github.com/agrc/roadkill-mobile/commit/701349a0457068bbd5e6acbb33a1c88efd63989e))
- make google sign in button compliant ([eb217c9](https://github.com/agrc/roadkill-mobile/commit/eb217c926959d2129122611f2ca355fbbcb3e4a5))
- make scheme match bundle id ([5a6b77b](https://github.com/agrc/roadkill-mobile/commit/5a6b77bd2d1d18f9b0d1d94485bedff33952ad1a))
- make sure entrypoint folder exists ([a608c51](https://github.com/agrc/roadkill-mobile/commit/a608c51283798e6600a75c1fe0063f87cd9cb397))
- make sure tokens are decoded when checking expiration date ([328cf28](https://github.com/agrc/roadkill-mobile/commit/328cf28130e8abe8ed08f43e630a47723058d844))
- move env vars to gcloud deploy ([835d46c](https://github.com/agrc/roadkill-mobile/commit/835d46c8a9b8577eaf9bdb6d9bc58ec2c81d8669))
- move sentry environment to config ([964516b](https://github.com/agrc/roadkill-mobile/commit/964516bc144f805a74fb01980837bbbfb6021b8d))
- only create postgis if it's not there already ([12a0b22](https://github.com/agrc/roadkill-mobile/commit/12a0b22159ba3d08b2e92e4e9fe9e878e95be68b))
- pass secrets as env ([12f2f76](https://github.com/agrc/roadkill-mobile/commit/12f2f76f7ca376729a4b6f06cf99ad436f55e145))
- patch expo-random ([9ed184a](https://github.com/agrc/roadkill-mobile/commit/9ed184a44a78cc66cd091a349a1222db08a0902c))
- remove unused an clean up layout ([77eece8](https://github.com/agrc/roadkill-mobile/commit/77eece82422f2ec0afdb3747488df3099155fa56))
- run tests on all branches ([ebce4e2](https://github.com/agrc/roadkill-mobile/commit/ebce4e230945ef43ecf7d690f40644c153f9313b))
- spelling ([6849886](https://github.com/agrc/roadkill-mobile/commit/68498869e3838b47162cccb4c86ad69e390652c0))
- switch to 3rd party error boundary and create hook for throwing async errors ([b1f8fc7](https://github.com/agrc/roadkill-mobile/commit/b1f8fc7d330c7dcf4a99e513a961bdfa9c99c986))
- tests ([e9ffb89](https://github.com/agrc/roadkill-mobile/commit/e9ffb898d5c96ba3f883b430855488ed88b46a92))
- turn off error log ([f31c379](https://github.com/agrc/roadkill-mobile/commit/f31c37914764b1e1e4e0865b1ea7ba97f52f3ccb))
- unzip ios app before running and auto open in sims ([6b5e852](https://github.com/agrc/roadkill-mobile/commit/6b5e85249f3f6b8c79d43bf4b00b2ad12af885d5))

### Features

- add cloud sql proxy script ([a560133](https://github.com/agrc/roadkill-mobile/commit/a560133cca7952fd13e761f7143107c97c827dec))
- add form validation to new user screen ([673b645](https://github.com/agrc/roadkill-mobile/commit/673b6453fd9b781f78bd7d82210ecdfcb86e7a86))
- add free type org to new user ([88b4130](https://github.com/agrc/roadkill-mobile/commit/88b4130e44d9fc1b5d2a8ae463878b971674cdc2))
- add google and refactor utahid auth provider ([0a5ace5](https://github.com/agrc/roadkill-mobile/commit/0a5ace58f03f6b00c347481c3740ade2009c8165)), closes [#62](https://github.com/agrc/roadkill-mobile/issues/62)
- add launch command to build for simulator ([cf85ea1](https://github.com/agrc/roadkill-mobile/commit/cf85ea13116c521c30af3c7fe3e31ec1c5ea3345))
- add more users and hide passwords in dev ([0e1d349](https://github.com/agrc/roadkill-mobile/commit/0e1d349c3fd95115e60e0cde41e840b6fa70569c))
- add recommended jest scripts from expo ([37fed67](https://github.com/agrc/roadkill-mobile/commit/37fed674cc76ab258dbfd5ca1d331184608abc31))
- add screen views to analytics ([ede014b](https://github.com/agrc/roadkill-mobile/commit/ede014b6b0b976a4649ff1a9f41ec9882aa606e2)), closes [#56](https://github.com/agrc/roadkill-mobile/issues/56)
- add script for building for simulators ([a1bb3b0](https://github.com/agrc/roadkill-mobile/commit/a1bb3b02ee2c804fc1dd64b4dc5fb8767ff42aeb))
- add sentry log to login error ([752b070](https://github.com/agrc/roadkill-mobile/commit/752b0707c9c393a63c5de70be7655ae108eb1052))
- add sentry logging to error logger ([b5264c5](https://github.com/agrc/roadkill-mobile/commit/b5264c59813e125e08f56a9ecea5a3e01e4911cb))
- add spinner overlay to login screen ([167ab96](https://github.com/agrc/roadkill-mobile/commit/167ab96c059cf5fbf4711e92b2d960048fd64776))
- add welcome message ([371b17c](https://github.com/agrc/roadkill-mobile/commit/371b17cbcc79a071dac1392a4341d47bb6e2ae12))
- **back:** add better error message for acted on users ([215d1fe](https://github.com/agrc/roadkill-mobile/commit/215d1feb3eea61a3385d26de8598e56192985a0c)), closes [#82](https://github.com/agrc/roadkill-mobile/issues/82)
- **back:** add composite start command ([a742c60](https://github.com/agrc/roadkill-mobile/commit/a742c6094ec05aac458d32a7d85aa67d6d646fc2))
- **back:** add cors support ([abe223f](https://github.com/agrc/roadkill-mobile/commit/abe223fa96048dc21749947bb9677df82354ff58))
- **back:** add github action for test, build, and deploy ([be62e68](https://github.com/agrc/roadkill-mobile/commit/be62e68a46eeaf7f05cfc597d01f96fbfccf3187))
- **back:** add google winston transport ([04b981d](https://github.com/agrc/roadkill-mobile/commit/04b981d3cd3176186d04d87180b38fc80913993d))
- **back:** add lint test to ci ([503aa7e](https://github.com/agrc/roadkill-mobile/commit/503aa7ee86a479a0e7b80b883d0f4b91865a2c6f))
- **back:** add more tests and refactor to make testing easier ([585e1b3](https://github.com/agrc/roadkill-mobile/commit/585e1b3032241220e26e59d263a96dfc08dd4018))
- **back:** add request logging ([34a1608](https://github.com/agrc/roadkill-mobile/commit/34a1608892e448404bda4855baff34d7af18a6b2))
- **back:** add secure middleware ([f2dda82](https://github.com/agrc/roadkill-mobile/commit/f2dda82323e075f9c8e67e65535912755feec3dc))
- **back:** add user caching via firestore ([b04c4a0](https://github.com/agrc/roadkill-mobile/commit/b04c4a09f51abe7bd4e6064bc71d912815d8b294))
- **back:** add user info to response object ([8a98a9b](https://github.com/agrc/roadkill-mobile/commit/8a98a9b72c3cfaded3a76362705bffd39e79ccca))
- **back:** better validate and pass through for token requests ([2417de0](https://github.com/agrc/roadkill-mobile/commit/2417de002a5a5468e3365dc5e1128f92f329ae44))
- **back:** use helmet security middleware ([3cb3e3f](https://github.com/agrc/roadkill-mobile/commit/3cb3e3fbbdf98909b055fb3c51d40bee5ffa4879))
- basic layout for login screen ([2851cae](https://github.com/agrc/roadkill-mobile/commit/2851cae09c873c9d3034ed0516440df2469b5c50))
- better auth flow ([f447922](https://github.com/agrc/roadkill-mobile/commit/f44792245b8da2674afea2ff347c50dcb708ad58))
- create dev postgres/postgis database with seed data ([bb0c665](https://github.com/agrc/roadkill-mobile/commit/bb0c665eb63bbaef3b39335bab11df39d4cacc7d)), closes [#26](https://github.com/agrc/roadkill-mobile/issues/26)
- **front:** add beginnings of report drawer ([e33c8c6](https://github.com/agrc/roadkill-mobile/commit/e33c8c6bab5a06bba61e0587dc93c81919e3b092))
- **front:** add close confirmation to report dialog ([d1b27f7](https://github.com/agrc/roadkill-mobile/commit/d1b27f757d76f1ad5a1c1e3540d177a1dfafb5e8)), closes [#38](https://github.com/agrc/roadkill-mobile/issues/38)
- **front:** add confirmation alert to logout ([71ffad4](https://github.com/agrc/roadkill-mobile/commit/71ffad45cf465ceb18e0f85210e01f8308ecad32)), closes [#77](https://github.com/agrc/roadkill-mobile/issues/77)
- **front:** add deploy GHA ([4b6277a](https://github.com/agrc/roadkill-mobile/commit/4b6277ac5b5532963f4781deef345961b128d6d8))
- **front:** add full screen animation for report view ([a35cde5](https://github.com/agrc/roadkill-mobile/commit/a35cde566099b134f104ba22988137461dc26487))
- **front:** add full screen map to main screen ([68d85c0](https://github.com/agrc/roadkill-mobile/commit/68d85c0ddbc9d5222df397e86322349312c24a7a)), closes [#72](https://github.com/agrc/roadkill-mobile/issues/72)
- **front:** add hamburger icon with stubbed out views ([da2aee5](https://github.com/agrc/roadkill-mobile/commit/da2aee547cb242f36930fc50ab06502fc9bdb131)), closes [#72](https://github.com/agrc/roadkill-mobile/issues/72)
- **front:** add menu badge for unsubmitted reports ([998263f](https://github.com/agrc/roadkill-mobile/commit/998263f65531c29c3dcaa2ec7c715a14478ba5a8)), closes [#72](https://github.com/agrc/roadkill-mobile/issues/72)
- **front:** add optional alert badge to menu button ([aad65a7](https://github.com/agrc/roadkill-mobile/commit/aad65a7b5888c7bc2b23f9f132b2ca0212475b5a)), closes [#72](https://github.com/agrc/roadkill-mobile/issues/72)
- **front:** add revision id ([93aca43](https://github.com/agrc/roadkill-mobile/commit/93aca437a5b209d33779029bc141ab2e087e770b))
- **front:** add spinner while waiting for initial location ([bd6b527](https://github.com/agrc/roadkill-mobile/commit/bd6b527e5251b5d27a1d0cfeb67ce54ac2a34cba))
- **front:** add version/build number to non-prod app ([d35b5fe](https://github.com/agrc/roadkill-mobile/commit/d35b5fe99d752489463b5284484caabf05779250))
- **front:** dynamically set build num to total commits ([e12262e](https://github.com/agrc/roadkill-mobile/commit/e12262e5713c8b0fd34923ca87eb04f1fac7dc73))
- **front:** finish set location part of new report drawer ([8fa5ff4](https://github.com/agrc/roadkill-mobile/commit/8fa5ff424b4dbb296c8cc49b1655071c81fa8704)), closes [#38](https://github.com/agrc/roadkill-mobile/issues/38)
- **front:** follow user on my location button tap ([323b9a8](https://github.com/agrc/roadkill-mobile/commit/323b9a83db9ea40fe3830654ef9ce0b9309d6436)), closes [#38](https://github.com/agrc/roadkill-mobile/issues/38)
- **front:** GHA for testing ([ce3495f](https://github.com/agrc/roadkill-mobile/commit/ce3495fdcb78131f15ea245c4892b474c200d685))
- **front:** implement expo-google-sign-in for android standalone ([140d01d](https://github.com/agrc/roadkill-mobile/commit/140d01df991e49e49c7b41de1353a729131fbdf2))
- **front:** implement firebase analytics ([aeb23a6](https://github.com/agrc/roadkill-mobile/commit/aeb23a644fe0bae642dfc3a928744030051b29ac)), closes [#51](https://github.com/agrc/roadkill-mobile/issues/51)
- **front:** implement zoom to current location button ([a0637bd](https://github.com/agrc/roadkill-mobile/commit/a0637bdd53311a77609032d2914a1308c9b4a4fe)), closes [#72](https://github.com/agrc/roadkill-mobile/issues/72)
- **front:** simple poc auth app ([ff5025a](https://github.com/agrc/roadkill-mobile/commit/ff5025a5c7964e123ef20b57f3ec125a75613cea))
- **front:** stub out add report and add route buttons ([08b5b20](https://github.com/agrc/roadkill-mobile/commit/08b5b20d4ef5b5081ca1ea862c98d189ead14981)), closes [#72](https://github.com/agrc/roadkill-mobile/issues/72)
- **front:** warm up web browser for auth ([ef7e5b4](https://github.com/agrc/roadkill-mobile/commit/ef7e5b475c209b8a747cb9b3d3261ba278ccc171))
- implement approval email system ([2b5b839](https://github.com/agrc/roadkill-mobile/commit/2b5b839eee75d9cec3950f1799e2dbade6b9a7a7)), closes [#82](https://github.com/agrc/roadkill-mobile/issues/82)
- implement choose role view ([98df73d](https://github.com/agrc/roadkill-mobile/commit/98df73d62eca4ce3ee515b6ca5602e1e2fd34617)), closes [#61](https://github.com/agrc/roadkill-mobile/issues/61)
- implement facebook auth ([0d68006](https://github.com/agrc/roadkill-mobile/commit/0d68006e88f49bb7e53b95cc84626b43be4c9a41)), closes [#62](https://github.com/agrc/roadkill-mobile/issues/62)
- implement global error boundary ([d7c6e74](https://github.com/agrc/roadkill-mobile/commit/d7c6e74a1850ff549a47ff128a20aba60522d865))
- implement google sign in an auth on back end ([35feb6c](https://github.com/agrc/roadkill-mobile/commit/35feb6cf330bcac43bf28fa53c4f715bc6889860)), closes [#62](https://github.com/agrc/roadkill-mobile/issues/62)
- implement new user screen ([d30830c](https://github.com/agrc/roadkill-mobile/commit/d30830c78fe2c9bfd4da1d2a43b9aa13a9c9b3ac)), closes [#66](https://github.com/agrc/roadkill-mobile/issues/66)
- implement sentry reporting ([7745611](https://github.com/agrc/roadkill-mobile/commit/7745611eb42a5868d26d58b5f3cae1b9087ebee9))
- implement testing library and build a few tests ([2256f65](https://github.com/agrc/roadkill-mobile/commit/2256f650973468bcc6c89c652534c53c1c964402))
- only show auth providers appropriate for role ([86d9621](https://github.com/agrc/roadkill-mobile/commit/86d96210856d10da09e1bc3e5da9eca910d2e244))
- register & login user endpoint and front end ([175b2e1](https://github.com/agrc/roadkill-mobile/commit/175b2e196ac9c01b33e256ae2d34fe7236551a23))
