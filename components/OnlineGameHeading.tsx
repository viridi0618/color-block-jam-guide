type OnlineGameHeadingProps = {
  as: "h1" | "h2";
  badge?: string;
  title: string;
  description: string;
};

export function OnlineGameHeading({
  as: Heading,
  badge,
  title,
  description,
}: OnlineGameHeadingProps) {
  return (
    <div className="online-game-heading">
      <div className="online-game-heading-icon" aria-hidden="true">
        <span className="online-game-gamepad-icon">
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 18v-2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="6"
              y="18"
              width="32"
              height="16"
              rx="6"
              stroke="#fff"
              strokeWidth="2.5"
            />
            <circle cx="14" cy="26" r="2" fill="#fff" />
            <circle cx="30" cy="26" r="2" fill="#fff" />
            <path
              d="M20 24v4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="online-game-heading-play">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 2l10 6-10 6V2z"
              fill="#241831"
            />
          </svg>
        </span>
      </div>

      {badge ? <p className="kicker">{badge}</p> : null}

      <Heading>{title}</Heading>

      <p className="online-game-heading-copy">{description}</p>
    </div>
  );
}