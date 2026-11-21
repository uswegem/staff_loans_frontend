// The header row of a card: a title, an optional line under it and an optional action on
// the right, with the card's divider. Replaces the inline-styled header repeated per page.

export default function CardHeader({ title, subtitle, action, as: Heading = 'h3' }) {
  return (
    <div className="cardhead">
      <div>
        <Heading>{title}</Heading>
        {subtitle && <div className="small muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
