import { Link } from "@remix-run/react";

export default function Index() {
  // navigating to this page via a link breaks the amd requires for some reason
  // maybe switching to the esri esm package will fix it...
  return (
    <ul className="p-5">
      <li>
        <Link to="/delete-account">How to Delete Your Account</Link>
      </li>
    </ul>
  );
}
