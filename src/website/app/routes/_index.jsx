export default function Index() {
  return (
    <div className="flex justify-center">
      <div className="max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-center sm:mb-10">
          <div className="text-gray-900" style={{ minWidth: '385px' }}>
            <h1 className="font-extrabold text-6xl">Utah Roadkill Reporter</h1>
            <h2 className="text-2xl">Report animals involved in Utah vehicle collisions.</h2>
          </div>
          <img alt="Utah Roadkill Reporter" src="/icon.png" className="sm:ml-5 w-1/4" />
        </div>
        <p className="text-lg whitespace-normal">
          The Utah Roadkill Reporter is a smartphone-based system for reporting animals involved in vehicle collisions.
          The app collects information on carcass location, species, gender, age class of the animal, and photo
          documentation. Submissions are live-fed into a database that notifies Utah Department of Transportation (UDOT)
          contractors and Utah Division of Wildlife Resources (UDWR) employees of animal reports by using GIS to collect
          additional information on highway and management regions. The data collected through this app will allow the
          UDWR and the UDOT to reduce wildlife-vehicle collisions and make highways safer for drivers and wildlife.
        </p>
        <div className="flex pt-4 justify-around items-center flex-wrap">
          <a
            href="https://apps.apple.com/us/app/utah-roadkill-reporter/id1566659475?itsct=apps_box_badge&amp;itscg=30200"
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              borderRadius: '13px',
              width: '250px',
              height: '83px',
            }}
          >
            <img
              src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1667260800?h=ed6fe6b2bdfd2a71fd9602adf7b16b11"
              alt="Download on the App Store"
              style={{ borderRadius: '13px', width: '250px', height: '83px' }}
            />
          </a>
          <a href="https://play.google.com/store/apps/details?id=gov.dts.ugrc.utahwvcr&pli=1&pcampaignid=pcampaignidMKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1">
            <img
              alt="Get it on Google Play"
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              style={{ height: '122px' }}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
