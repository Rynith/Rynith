"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle, Loader2, Inbox, Copy, Check, Upload
} from "lucide-react"

const RETAILER_TYPES = [
  "Fashion / Apparel",
  "Beauty",
  "Electronics",
  "Home & Living",
  "Food & Beverage",
  "Other",
]

export default function OnboardingPage() {
  const router = useRouter()

  // Progress / UI
  const [step] = useState(1) // keep your progress bar aesthetic

  // Action A — retailer type
  const [retailerType, setRetailerType] = useState(RETAILER_TYPES[0])
  const [savingType, setSavingType] = useState(false)
  const [typeSaved, setTypeSaved] = useState(false)

  // Action B — email ingestion
  const [connecting, setConnecting] = useState(false)
  const [alias, setAlias] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Advanced — CSV
  const [advOpen, setAdvOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvBusy, setCsvBusy] = useState(false)
  const [csvMsg, setCsvMsg] = useState<string | null>(null)

  // Advanced — Paste
  const [pasteText, setPasteText] = useState("")
  const [pasteBusy, setPasteBusy] = useState(false)
  const [pasteMsg, setPasteMsg] = useState<string | null>(null)

  // --- handlers ---

  const saveRetailerType = async () => {
    try {
      setSavingType(true)
      setTypeSaved(false)
      const res = await fetch("/api/org/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailerType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save")
      }
      setTypeSaved(true)
      setTimeout(() => setTypeSaved(false), 2000)
    } catch (e: any) {
      alert(e?.message || "Could not save retailer type")
    } finally {
      setSavingType(false)
    }
  }

  const connectEmail = async () => {
    try {
      setConnecting(true)
      const res = await fetch("/api/sources/connect-email", { method: "POST" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to connect email ingestion")
      setAlias(data?.alias || null)
    } catch (e: any) {
      alert(e?.message || "Could not connect email ingestion")
    } finally {
      setConnecting(false)
    }
  }

  const copyAlias = async () => {
    if (!alias) return
    await navigator.clipboard.writeText(alias)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const goDashboard = () => router.push("/dashboard")

  const uploadCsv = async () => {
    if (!csvFile) {
      setCsvMsg("Please choose a CSV file.")
      return
    }
    try {
      setCsvBusy(true)
      setCsvMsg(null)
      const fd = new FormData()
      fd.set("file", csvFile)
      const res = await fetch("/api/ingest/csv", { method: "POST", body: fd })
      await fetch("/api/analyze", { method: "POST" }).catch(()=>{})
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Upload failed")
      setCsvMsg(`Imported ${data?.inserted ?? 0} reviews.`)
    } catch (e: any) {
      setCsvMsg(e?.message || "Upload failed")
    } finally {
      setCsvBusy(false)
    }
  }

  const submitPaste = async () => {
    if (!pasteText.trim()) {
      setPasteMsg("Paste one review per line (e.g., 5 | Loved it!)")
      return
    }
    try {
      setPasteBusy(true)
      setPasteMsg(null)
      const res = await fetch("/api/ingest/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      })
      await fetch("/api/analyze", { method: "POST" }).catch(()=>{})
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Paste failed")
      setPasteMsg(`Imported ${data?.inserted ?? 0} reviews.`)
    } catch (e: any) {
      setPasteMsg(e?.message || "Paste failed")
    } finally {
      setPasteBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Progress indicator (kept from your design) */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center text-white text-sm font-medium">
              {step}
            </div>
            <div className="w-16 h-1 bg-gray-200 rounded" />
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">2</div>
            <div className="w-16 h-1 bg-gray-200 rounded" />
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">3</div>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Get Set Up</CardTitle>
            <CardDescription className="text-gray-600 text-base leading-relaxed">
              Tell us about your business and connect automatic review collection. CSV is available under Advanced.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Action A — Retailer type */}
            <div className="bg-violet-50 rounded-lg p-4 border border-violet-100 space-y-3">
              <h3 className="font-semibold text-gray-900">What kind of retailer are you?</h3>
              <select
                className="w-full h-10 rounded-md border px-3"
                value={retailerType}
                onChange={(e) => setRetailerType(e.target.value)}
              >
                {RETAILER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <Button onClick={saveRetailerType} disabled={savingType}>
                  {savingType ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
                {typeSaved && (
                  <span className="text-sm text-emerald-700 inline-flex items-center gap-1">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </div>

            {/* Action B — Email ingestion (default) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Automatic collection (recommended)</h3>

              {!alias ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Click connect to generate your unique forwarding address. Forward your “new review” emails there and
                    we’ll ingest them automatically.
                  </p>
                  <Button onClick={connectEmail} disabled={connecting} className="w-full h-11">
                    {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Inbox className="mr-2 h-4 w-4" />}
                    Connect Email Ingestion
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border p-3 bg-white">
                    <div>
                      <p className="text-sm text-gray-500">Your unique address</p>
                      <code className="text-sm font-mono">{alias}</code>
                    </div>
                    <Button variant="outline" size="sm" onClick={copyAlias}>
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  <ol className="list-decimal list-inside text-sm space-y-1 text-gray-600">
                    <li>Open your email/review app notification settings.</li>
                    <li>Forward new review emails to the address above.</li>
                    <li>We’ll parse and store reviews as they arrive.</li>
                  </ol>

                  <div className="flex items-center justify-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 text-sm">Email ingestion connected</span>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={goDashboard} className="flex items-center space-x-2">
                      <span>I’ve set up forwarding — Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Advanced: CSV / Paste */}
            <div className="space-y-3">
              <button
                type="button"
                className="text-sm text-purple-700 hover:underline"
                onClick={() => setAdvOpen((v) => !v)}
              >
                {advOpen ? "Hide Advanced (CSV / Paste)" : "Advanced (CSV upload or Paste instead)"}
              </button>

              {advOpen && (
                <div className="space-y-6">
                  {/* CSV */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2"><Upload className="h-4 w-4" /> CSV Upload</h4>
                    <p className="text-sm text-gray-600">Columns: rating,title,body,published_at,author,external_id</p>
                    <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
                    <div className="flex items-center gap-2">
                      <Button onClick={uploadCsv} disabled={csvBusy}>
                        {csvBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Upload CSV
                      </Button>
                      {csvMsg && <span className="text-sm">{csvMsg}</span>}
                    </div>
                  </div>

                  {/* Paste */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="font-medium">Paste Reviews</h4>
                    <p className="text-sm text-gray-600">One per line (optional: &lt;rating&gt; | &lt;text&gt;)</p>
                    <Textarea
                      rows={6}
                      placeholder={`5 | Loved the quality and delivery speed!\n2 | Sizes run small, had to return.`}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={submitPaste} disabled={pasteBusy}>
                        {pasteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Pasted Reviews
                      </Button>
                      {pasteMsg && <span className="text-sm">{pasteMsg}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Back button (kept) */}
            <div className="flex justify-between pt-2">
              <Link href="/auth">
                <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>
              </Link>

              {/* If you want a “Continue” here too, leave it: */}
              <Button
                onClick={goDashboard}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <span>Skip for now</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { ArrowLeft, ArrowRight, Building2, CheckCircle } from "lucide-react"
// import Link from "next/link"

// export default function OnboardingPage() {
//   const [isConnected, setIsConnected] = useState(false)
//   const [isConnecting, setIsConnecting] = useState(false)

//   const handleGoogleConnect = async () => {
//     setIsConnecting(true)
//     // Simulate OAuth connection
//     setTimeout(() => {
//       setIsConnected(true)
//       setIsConnecting(false)
//     }, 2000)
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         {/* Progress indicator */}
//         <div className="flex items-center justify-center mb-8">
//           <div className="flex items-center space-x-2">
//             <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center text-white text-sm font-medium">
//               1
//             </div>
//             <div className="w-16 h-1 bg-gray-200 rounded"></div>
//             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
//               2
//             </div>
//             <div className="w-16 h-1 bg-gray-200 rounded"></div>
//             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
//               3
//             </div>
//           </div>
//         </div>

//         <Card className="border-0 shadow-xl">
//           <CardHeader className="text-center pb-6">
//             <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
//               <Building2 className="w-8 h-8 text-white" />
//             </div>
//             <CardTitle className="text-2xl font-bold text-gray-900">Connect Your Business</CardTitle>
//             <CardDescription className="text-gray-600 text-base leading-relaxed">
//               Connect your Google Business account to start analyzing customer feedback and reviews automatically.
//             </CardDescription>
//           </CardHeader>

//           <CardContent className="space-y-6">
//             {/* Why we need this */}
//             <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
//               <h3 className="font-semibold text-gray-900 mb-2">Why do we need this?</h3>
//               <ul className="text-sm text-gray-600 space-y-1">
//                 <li>• Access your customer reviews and ratings</li>
//                 <li>• Monitor feedback across all locations</li>
//                 <li>• Generate AI-powered insights and suggestions</li>
//               </ul>
//             </div>

//             {/* Connection button */}
//             <div className="space-y-4">
//               {!isConnected ? (
//                 <Button
//                   onClick={handleGoogleConnect}
//                   disabled={isConnecting}
//                   className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition-all duration-200"
//                 >
//                   {isConnecting ? (
//                     <div className="flex items-center space-x-2">
//                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                       <span>Connecting...</span>
//                     </div>
//                   ) : (
//                     <div className="flex items-center space-x-2">
//                       <svg className="w-5 h-5" viewBox="0 0 24 24">
//                         <path
//                           fill="currentColor"
//                           d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//                         />
//                         <path
//                           fill="currentColor"
//                           d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//                         />
//                         <path
//                           fill="currentColor"
//                           d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//                         />
//                         <path
//                           fill="currentColor"
//                           d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//                         />
//                       </svg>
//                       <span>Connect Google Business</span>
//                     </div>
//                   )}
//                 </Button>
//               ) : (
//                 <div className="flex items-center justify-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
//                   <CheckCircle className="w-5 h-5 text-green-600" />
//                   <span className="text-green-700 font-medium">Successfully connected!</span>
//                 </div>
//               )}
//             </div>

//             {/* Navigation buttons */}
//             <div className="flex justify-between pt-4">
//               <Link href="/auth">
//                 <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
//                   <ArrowLeft className="w-4 h-4" />
//                   <span>Back</span>
//                 </Button>
//               </Link>

//               <Link href="/dashboard">
//                 <Button
//                   disabled={!isConnected}
//                   className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
//                 >
//                   <span>Continue</span>
//                   <ArrowRight className="w-4 h-4" />
//                 </Button>
//               </Link>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }
