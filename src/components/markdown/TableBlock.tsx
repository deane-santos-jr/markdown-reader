import React from 'react';

export const TableBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="markdown-table-wrapper">
      <table>{children}</table>
    </div>
  );
};
