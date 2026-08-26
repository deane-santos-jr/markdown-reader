import React from 'react';
import { Info, Lightbulb, AlertTriangle, Flame, ShieldAlert } from 'lucide-react';

interface CalloutBlockProps {
  children: React.ReactNode;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({ children }) => {
  // Convert children to text to inspect if it matches GitHub alert format
  const extractFirstParagraphText = (node: any): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractFirstParagraphText).join('');
    if (node?.props?.children) return extractFirstParagraphText(node.props.children);
    return '';
  };

  const textContent = extractFirstParagraphText(children).trim();
  const alertMatch = textContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

  if (!alertMatch) {
    return <blockquote>{children}</blockquote>;
  }

  const alertType = alertMatch[1].toUpperCase();

  let Icon = Info;
  let title = 'Note';
  let alertClass = 'markdown-alert-note';

  switch (alertType) {
    case 'NOTE':
      Icon = Info;
      title = 'Note';
      alertClass = 'markdown-alert-note';
      break;
    case 'TIP':
      Icon = Lightbulb;
      title = 'Tip';
      alertClass = 'markdown-alert-tip';
      break;
    case 'IMPORTANT':
      Icon = Flame;
      title = 'Important';
      alertClass = 'markdown-alert-important';
      break;
    case 'WARNING':
      Icon = AlertTriangle;
      title = 'Warning';
      alertClass = 'markdown-alert-warning';
      break;
    case 'CAUTION':
      Icon = ShieldAlert;
      title = 'Caution';
      alertClass = 'markdown-alert-caution';
      break;
  }

  // Filter out the [!TYPE] marker from the first paragraph
  const cleanChildren = React.Children.map(children, (child, index) => {
    if (index === 0 && React.isValidElement(child)) {
      const pChildren = (child.props as any).children;
      if (Array.isArray(pChildren)) {
        const newFirstChild = typeof pChildren[0] === 'string'
          ? pChildren[0].replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '')
          : pChildren[0];
        return React.cloneElement(child, {
          ...(child.props as any),
          children: [newFirstChild, ...pChildren.slice(1)],
        });
      } else if (typeof pChildren === 'string') {
        return React.cloneElement(child, {
          ...(child.props as any),
          children: pChildren.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, ''),
        });
      }
    }
    return child;
  });

  return (
    <div className={`markdown-alert ${alertClass}`}>
      <div className="markdown-alert-title">
        <Icon size={16} />
        <span>{title}</span>
      </div>
      <div>{cleanChildren}</div>
    </div>
  );
};
