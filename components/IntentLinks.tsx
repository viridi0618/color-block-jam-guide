import Link from "next/link";

const links = [
  { href: "/#find-level", label: "Find a Level", text: "Jump directly to your walkthrough", icon: "⌕" },
  { href: "/levels", label: "Browse All Color Block Jam Levels", text: "Explore every available walkthrough", icon: "▦" },
  { href: "/play-online", label: "Play Online", text: "Start a browser puzzle game", icon: "◎" },
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
