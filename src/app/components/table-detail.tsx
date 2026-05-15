import React from 'react';
import { cn, fmt, activeVer, Btn, StatusBadge, Tag, IC, Table } from './shared';

export const TableDetailPage: React.FC<{ tbl: Table; onBack: () => void }> = ({ tbl, onBack }) => {
  const ver = activeVer(tbl) || tbl.versions[0];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <IC.Back size={14} />Decisions
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{tbl.name}</h1>
            <div className="flex gap-1.5 mt-1">{tbl.tags.map(t => <Tag key={t} label={t} />)}</div>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="outline"><IC.Copy size={13} />Clone</Btn>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-4xl flex flex-col gap-5">
          {/* Version info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={ver?.status || 'DRAFT'} />
              <span className="text-sm text-gray-500">v{ver?.version}</span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500">Hit policy: <strong className="text-gray-700">{ver?.table?.hitPolicy?.replace(/_/g, ' ')}</strong></span>
            </div>
            <p className="text-sm text-gray-600">{ver?.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>From: {fmt(ver?.effectiveFrom)}</span>
              {ver?.effectiveUntil ? <span>Until: {fmt(ver.effectiveUntil)}</span> : <span>Open-ended</span>}
            </div>
          </div>

          {/* Table data */}
          {ver?.table && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Decision Table</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ver.table.rows.length} rows · {ver.table.inputs.length} input{ver.table.inputs.length !== 1 ? 's' : ''} · {ver.table.outputs.length} output{ver.table.outputs.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" variant="outline"><IC.Flow size={13} />Execute</Btn>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-xs font-semibold text-gray-400 text-left">#</th>
                      {ver.table.inputs.map((inp, i) => (
                        <th key={i} className="px-3 py-2.5 text-xs font-semibold text-amber-600 text-left">
                          <div>{inp.label || inp.field}</div>
                          <div className="text-gray-400 font-normal">{inp.operator} · {inp.dataType}</div>
                        </th>
                      ))}
                      {ver.table.outputs.map((out, i) => (
                        <th key={i} className="px-3 py-2.5 text-xs font-semibold text-blue-600 text-left">
                          <div>{out.label || out.field}</div>
                          <div className="text-gray-400 font-normal">{out.dataType}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-xs font-semibold text-gray-400 text-left">Enabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ver.table.rows.map(row => (
                      <tr key={row.id} className={cn('transition-colors', row.isEnabled ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-50')}>
                        <td className="px-3 py-2 text-xs text-gray-400">{row.id}</td>
                        {row.inputs.map((inp, i) => (
                          <td key={i} className="px-3 py-2 font-mono text-xs text-gray-700">{inp}</td>
                        ))}
                        {row.outputs.map((out, i) => (
                          <td key={i} className="px-3 py-2 font-mono text-xs text-blue-700 font-medium">{out}</td>
                        ))}
                        <td className="px-3 py-2">
                          <span className={cn('text-xs font-medium', row.isEnabled ? 'text-green-600' : 'text-gray-400')}>
                            {row.isEnabled ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* API reference */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-600 mb-3">API Reference</p>
            <div className="space-y-1.5">
              {[
                ['GET', `/api/v1/spaces/motor-uw/tables/${tbl.id}/versions/${ver?.version}`],
                ['POST', `/api/v1/spaces/motor-uw/tables/${tbl.id}/execute`],
                ['PUT', `/api/v1/spaces/motor-uw/tables/${tbl.id}/rows/{rowId}/enable`],
                ['PUT', `/api/v1/spaces/motor-uw/tables/${tbl.id}/rows/{rowId}/disable`],
                ['POST', `/api/v1/spaces/motor-uw/tables/${tbl.id}/versions/${ver?.version}/activate`],
              ].map(([method, path]) => (
                <p key={path} className="font-mono text-xs text-gray-500">
                  <span className={cn('font-bold mr-2', method === 'GET' ? 'text-green-600' : method === 'POST' ? 'text-blue-600' : 'text-amber-600')}>{method}</span>
                  {path}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
