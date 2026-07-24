import Link from "next/link";

const links = [
  { href: "/download", label: "Download the Game", text: "Official iOS and Android links", icon: "↓" },
  { href: "/play-on-pc", label: "Play on PC", text: "Official Windows option", icon: "▣" },
  { href: "/play-online", label: "Play Online", text: "Browser availability explained", icon: "◎" },
  { href: "/faq", label: "Game FAQ", text: "Quick answers and help", icon: "?" },
];

export function IntentLinks() {
  return (
    <div className="game-help-grid">
      {links.map((item, index) => (
        <Link href={item.href} className={`game-help-card help-${index + 1}`} key={item.href}>
          <span aria-hidden="true">{item.icon}</span>
          <strong>{item.label}</strong>
          <small>{item.text}</small>
          <i aria-hidden="true">→</i>
        </Link>
      ))}
    </div>
  );
}
