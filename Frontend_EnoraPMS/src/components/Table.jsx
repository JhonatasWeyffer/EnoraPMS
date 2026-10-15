export default function Table({ columns, data, actions }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              {actions && <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="p-4 text-sm text-gray-600 whitespace-nowrap">
                      {/* Se a coluna tiver uma função render, use-a. Senão, mostre o texto puro. */}
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  
                  {actions && (
                    <td className="p-4 text-sm text-right whitespace-nowrap">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="p-8 text-center text-gray-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}