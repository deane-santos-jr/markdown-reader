import React from 'react';

interface TaskItemProps {
  checked?: boolean;
  children: React.ReactNode;
  onToggle?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ checked = false, children, onToggle }) => {
  return (
    <li className={`task-list-item ${checked ? 'completed' : ''}`}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={checked}
        onChange={onToggle}
      />
      <div>{children}</div>
    </li>
  );
};
