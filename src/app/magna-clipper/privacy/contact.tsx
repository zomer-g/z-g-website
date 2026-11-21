/** Contact address shown at the end of both Magna Clipper policy pages. */
export const MAGNA_CLIPPER_CONTACT_EMAIL = "guy@z-g.co.il";

export function ContactEmail() {
  const email = MAGNA_CLIPPER_CONTACT_EMAIL;
  if (!email.includes("@")) return <span dir="ltr">{email}</span>;
  return (
    <a href={`mailto:${email}`} dir="ltr" lang="en">
      {email}
    </a>
  );
}
