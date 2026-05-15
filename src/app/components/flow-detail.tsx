import React from 'react';
import { cn, fmt, activeVer, Btn, StatusBadge, Tag, IC, Flow } from './shared';

const NODE_COLORS: Record<string, string> = {
  start: 'bg-green-100 text-green-700 border-green-200',
  end: 'bg-red-100 text-red-700 border-red-200',
  rule: 'bg-blue-50 text-blue-700 border-blue-200',
  table: 'bg-purple-50 text-purple-700 border-purple-200',
  expression: 'bg-amber-50 text-amber-700 border-amber-200',
  transform: 'bg-orange-50 text-orange-700 border-orange-200',
  enrich: 'bg-teal-50 text-teal-700 border-teal-200',
  loop: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  subflow: 'bg-gray-50 text-gray-700 border-gray-200',
};

export const FlowDetailPage: React.FC<{ flow: Flow; onBack: () => void }> = ({ flow, onBack }) => {
  const ver = activeVer(flow) || flow.versions[0];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <IC.Back size={14} />Decisions
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">{flow.name}</h1>
              {flow.stopOnError && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded font-medium">Stop on Error</span>
              )}
            </div>
            <div className="flex gap-1.5 mt-1">{flow.tags.map(t => <Tag key={t} label={t} />)}</div>
          </div>
          <Btn size="sm" variant="outline"><IC.Flow size={13} />Execute</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-3xl flex flex-col gap-5">
          {/* Version info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={ver?.status || 'DRAFT'} />
              <span className="text-sm text-gray-500">v{ver?.version}</span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500">
                Merge: <strong className="text-gray-700">{ver?.flow?.mergeStrategy?.replace(/_/g, ' ')}</strong>
              </span>
            </div>
            <p className="text-sm text-gray-600">{ver?.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>From: {fmt(ver?.effectiveFrom)}</span>
              {ver?.effectiveUntil ? <span>Until: {fmt(ver.effectiveUntil)}</span> : <span>Open-ended</span>}
            </div>
          </div>

          {/* Pipeline */}
          {ver?.flow && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Pipeline Nodes ({ver.flow.nodes.length})
              </p>
              <div className="flex flex-col gap-2">
                {ver.flow.nodes.map((node, i) => (
                  <div key={node.id} className="flex items-center gap-3">
                    <div className={cn('flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium flex-1', NODE_COLORS[node.type] || 'bg-gray-50 text-gray-700 border-gray-200')}>
                      <span className="text-xs opacity-60 font-mono uppercase">{node.type}</span>
                      <span>{node.name}</span>
                      {node.config?.ruleRef && <span className="text-xs opacity-50 ml-auto font-mono">{node.config.ruleRef}</span>}
                      {node.config?.tableRef && <span className="text-xs opacity-50 ml-auto font-mono">{node.config.tableRef}</span>}
                    </div>
                    {i < ver.flow.nodes.length - 1 && (
                      <div className="flex flex-col items-center shrink-0">
                        <IC.Flow size={14} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Edge map */}
              {ver.flow.edges.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Edges ({ver.flow.edges.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {ver.flow.edges.map(e => {
                      const src = ver.flow.nodes.find(n => n.id === e.source);
                      const tgt = ver.flow.nodes.find(n => n.id === e.target);
                      return (
                        <span key={e.id} className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1 font-mono">
                          {src?.name || e.source} → {tgt?.name || e.target}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Merge strategy info */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2">Merge Strategy: {ver?.flow?.mergeStrategy?.replace(/_/g, ' ')}</p>
            <p className="text-xs text-blue-600">
              {ver?.flow?.mergeStrategy === 'last_writer_wins' && 'Later stage overwrites earlier values for the same field.'}
              {ver?.flow?.mergeStrategy === 'union_all' && 'All field values from all stages are kept.'}
              {ver?.flow?.mergeStrategy === 'fail_on_conflict' && 'Execution fails if two stages write different values to the same field.'}
            </p>
          </div>

          {/* API reference */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-600 mb-3">API Reference</p>
            <div className="space-y-1.5">
              {[
                ['GET', `/api/v1/spaces/motor-uw/flows/${flow.id}/versions/${ver?.version}`],
                ['POST', `/api/v1/spaces/motor-uw/flows/${flow.id}/execute`],
                ['POST', `/api/v1/spaces/motor-uw/flows/${flow.id}/compare`],
                ['POST', `/api/v1/spaces/motor-uw/flows/${flow.id}/versions/${ver?.version}/activate`],
              ].map(([method, path]) => (
                <p key={path} className="font-mono text-xs text-gray-500">
                  <span className={cn('font-bold mr-2', method === 'GET' ? 'text-green-600' : 'text-blue-600')}>{method}</span>
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
