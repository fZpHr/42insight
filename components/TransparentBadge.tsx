export const TransparentBadge: React.FC<{
  text: string;
  bgColor: string;
  textColor: string;
}> = ({ text, bgColor, textColor }) => {
  return (
    <span
      className={`backdrop-blur-sm px-3 py-1 rounded-md transition-colors cursor-default ${bgColor} ${textColor}`}
    >
      {text}
    </span>
  );
};
