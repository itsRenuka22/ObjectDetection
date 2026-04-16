import LatencyBadge from './LatencyBadge';

function confidenceColor(score) {
  if (score >= 0.8) return 'bg-green-900/60 text-green-300 border-green-700';
  if (score >= 0.5) return 'bg-yellow-900/60 text-yellow-300 border-yellow-700';
  return 'bg-red-900/60 text-red-300 border-red-700';
}

export default function DetectionResults({ result, modelName }) {
  const detections = result?.detections ?? [];

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex flex-wrap items-center gap-3">
        {modelName && (
          <span className="px-3 py-1 bg-blue-900/50 border border-blue-700 text-blue-300 rounded-lg text-sm font-medium">
            {modelName}
          </span>
        )}
        <LatencyBadge ms={result?.latency_ms} />
        <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm">
          {detections.length} object{detections.length !== 1 ? 's' : ''} detected
        </span>
      </div>

      {/* Annotated image */}
      {result?.annotated_image && (
        <div className="rounded-xl overflow-hidden border border-gray-800">
          <img
            src={`data:image/jpeg;base64,${result.annotated_image}`}
            alt="Annotated detection result"
            className="w-full object-contain max-h-96 bg-black"
          />
        </div>
      )}

      {/* Detections table */}
      {detections.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Detected Objects
          </h3>
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Label</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Confidence</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {detections.map((det, i) => (
                  <tr key={i} className="bg-gray-950/50 hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-200 font-medium capitalize">
                      {det.label ?? det.class ?? det.name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5 max-w-24">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${(det.confidence ?? det.score ?? 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-md border text-xs font-mono font-semibold ${confidenceColor(det.confidence ?? det.score ?? 0)}`}>
                        {((det.confidence ?? det.score ?? 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No objects detected in this image.
        </div>
      )}
    </div>
  );
}
