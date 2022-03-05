import { Link } from 'remix';

export default function Index() {
  // navigating to this page via a link breaks the amd requires for some reason
  // maybe switching to the esri esm package will fix it...
  return <Link to="/notification-map">Notification Map</Link>;
}
