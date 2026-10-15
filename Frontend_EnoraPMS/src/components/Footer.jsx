export default function Footer({cia, about, contact, privacidade}) {
  return (
    <div className="footer">
      <p>{cia}</p>
      <nav>
        <a href="#">{about}</a> | 
        <a href="#">{contact}</a> | 
        <a href="#">{privacidade}</a>
      </nav>
    </div>
  );
}
