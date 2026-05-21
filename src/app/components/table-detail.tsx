import React from 'react';
import { cn, fmt, activeVer, Btn, StatusBadge, Tag, IC, Table } from './shared';

export const TableDetailPage: React.FC<{ tbl: Table; onBack: () => void }> = ({ tbl, onBack }) => {
  const ver = activeVer(tbl) || tbl.versions[0];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5 text-sm mb-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">Decisions</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium truncate max-w-xs">{tbl.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{tbl.name}</h1>
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
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={ver?.status || 'DRAFT'} />
              <span className="text-sm text-muted-foreground">v{ver?.version}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-sm text-muted-foreground">Hit policy: <strong className="text-foreground">{ver?.table?.hitPolicy?.replace(/_/g, ' ')}</strong></span>
            </div>
            <p className="text-sm text-muted-foreground">{ver?.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>From: {fmt(ver?.effectiveFrom)}</span>
              {ver?.effectiveUntil ? <span>Until: {fmt(ver.effectiveUntil)}</span> : <span>Open-ended</span>}
            </div>
          </div>

          {/* Table data */}
          {ver?.table && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Decision Table</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ver.table.rows.length} rows · {ver.table.inputs.length} input{ver.table.inputs.length !== 1 ? 's' : ''} · {ver.table.outputs.length} output{ver.table.outputs.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" variant="outline"><IC.Flow size={13} />Execute</Btn>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground text-left">#</th>
                      {ver.table.inputs.map((inp, i) => (
                        <th key={i} className="px-3 py-2.5 text-xs font-semibold text-amber-600 text-left">
                          <div>{inp.label || inp.field}</div>
                          <div className="text-muted-foreground font-normal">{inp.operator} · {inp.dataType}</div>
                        </th>
                      ))}
                      {ver.table.outputs.map((out, i) => (
                        <th key={i} className="px-3 py-2.5 text-xs font-semibold text-primary text-left">
                          <div>{out.label || out.field}</div>
                          <div className="text-muted-foreground font-normal">{out.dataType}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground text-left">Enabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {ver.table.rows.map(row => (
                      <tr key={row.id} className={cn('transition-colors', row.isEnabled ? 'hover:bg-accent/50' : 'bg-muted opacity-50')}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.id}</td>
                        {row.inputs.map((inp, i) => (
                          <td key={i} className="px-3 py-2 font-mono text-xs text-foreground">{inp}</td>
                        ))}
                        {row.outputs.map((out, i) => (
                          <td key={i} className="px-3 py-2 font-mono text-xs text-primary font-medium">{out}</td>
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
          <div className="bg-muted/50 rounded-xl border border-border p-5">
            <p className="text-xs font-semibold text-muted-foreground mb-3">API Reference</p>
            <div className="space-y-1.5">
              {[
                ['GET', `/api/v1/spaces/motor-uw/tables/${tbl.id}/versions/${ver?.version}`],
                ['POST', `/api/v1/spaces/motor-uw/tables/${tbl.id}/execute`],
                ['PUT', `/api/v1/spaces/motor-uw/tables/${tbl.id}/rows/{rowId}/enable`],
                ['PUT', `/api/v1/spaces/motor-uw/tables/${tbl.id}/rows/{rowId}/disable`],
                ['POST', `/api/v1/spaces/motor-uw/tables/${tbl.id}/versions/${ver?.version}/activate`],
              ].map(([method, path]) => (
                <p key={path} className="font-mono text-xs text-muted-foreground">
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
