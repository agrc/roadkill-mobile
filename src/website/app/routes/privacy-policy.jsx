export default function PrivacyPolicy() {
  return (
    <div className="p-5">
      <h1 className="text-2xl py-2">Privacy, User Account and Data Deletion</h1>
      <p className="my-2">
        The Utah Roadkill Reporter adheres to the{' '}
        <a className="text-blue-500 underline" href="https://www.utah.gov/support/privacypolicy.html">
          utah.gov Privacy Policy
        </a>
        .
      </p>
      <p className="my-2">
        If you choose to{' '}
        <a className="text-blue-500 underline" href="./delete-account">
          delete your Utah Roadkill Reporter account
        </a>
        , all personally identifiable information (name, email, phone number) included in your account will be deleted,
        while any reported animal location and species information you submitted will be kept for important
        wildlife-related data analysis and decision making, and maintained pursuant to GRAMA and State of Utah record
        retention requirements. To delete all personally identifiable information and any data you submitted using the
        Roadkill Reporter app, please send an email request to{' '}
        <a className="text-blue-500 underline" href="mailto:utah-roadkill-reporter-notify@utah.gov">
          utah-roadkill-reporter-notify@utah.gov
        </a>
        .
      </p>
    </div>
  );
}
