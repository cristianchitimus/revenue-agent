import { db } from "@/lib/db";
import { Send } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  let proposals: any[] = [];

  try {
    proposals = await db.proposal.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        job: {
          include: { platform: true },
        },
      },
    });
  } catch {
    // DB not ready
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Send className="w-6 h-6 text-amber-400" />
          Proposals
        </h1>
        <p className="text-gray-400 mt-1">AI-generated proposals ready to send</p>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-2">No proposals yet.</p>
          <p className="text-gray-600 text-sm">Run the freelance agent first — it will score jobs and generate proposals for the best matches.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <a
                    href={proposal.job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-emerald-400 transition-colors"
                  >
                    {proposal.job.title}
                  </a>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{proposal.job.platform.name}</span>
                    {proposal.job.budget && <span>Budget: €{proposal.job.budget}</span>}
                    {proposal.job.aiScore && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        proposal.job.aiScore >= 70 ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>
                        Score: {proposal.job.aiScore.toFixed(0)}
                      </span>
                    )}
                    {proposal.job.aiComplexity && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        proposal.job.aiComplexity === "auto" ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>{proposal.job.aiComplexity}</span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-emerald-400">€{proposal.bidAmount}</p>
                  {proposal.estimatedHours && (
                    <p className="text-xs text-gray-500">{proposal.estimatedHours}h est.</p>
                  )}
                </div>
              </div>

              {/* Proposal text */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-3">
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{proposal.content}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {}}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
                >
                  Copy proposal
                </button>
                <a
                  href={proposal.job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                >
                  Open on {proposal.job.platform.name}
                </a>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs ${
                  proposal.status === "sent" ? "bg-blue-500/10 text-blue-400" :
                  proposal.status === "accepted" ? "bg-emerald-500/10 text-emerald-400" :
                  "bg-gray-500/10 text-gray-400"
                }`}>{proposal.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
