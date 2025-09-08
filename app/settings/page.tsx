"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Settings, User, Bell, Unlink } from "lucide-react"
import RetrySyncButton from "@/app/settings/retrysyncbutton"
import { supabaseBrowser } from "@/lib/supabase-browser"

type Source = {
  id: string
  kind: string
  display_name: string | null
  status: string | null
  error?: string | null
  last_sync_at?: string | null
  next_sync_at?: string | null
  config?: any
}

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("Acme Coffee Shop")
  const [industry, setIndustry] = useState("restaurant")
  const [timezone, setTimezone] = useState("America/New_York")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [isConnected, setIsConnected] = useState(true)

  const [sources, setSources] = useState<Source[]>([])
  const [loadingSources, setLoadingSources] = useState(false)

  useEffect(() => {
    const loadSources = async () => {
      setLoadingSources(true)
      const supabase = supabaseBrowser()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingSources(false); return }

      const { data: mem } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single()

      if (!mem?.org_id) { setLoadingSources(false); return }

      const { data: srcs } = await supabase
        .from("sources")
        .select("id, kind, display_name, status, error, last_sync_at, next_sync_at, config")
        .eq("org_id", mem.org_id)
        .order("created_at", { ascending: true })

      setSources(srcs ?? [])
      setLoadingSources(false)
    }
    loadSources()
  }, [])

  const handleSave = () => {
    console.log("Settings saved")
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    console.log("Google account disconnected")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant & Food</SelectItem>
                    <SelectItem value="retail">Retail & Shopping</SelectItem>
                    <SelectItem value="services">Professional Services</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                    <SelectItem value="automotive">Automotive</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive instant notifications for new reviews and feedback</p>
                </div>
                <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-digest">Weekly Digest</Label>
                  <p className="text-sm text-gray-500">Get a weekly summary of your customer feedback and insights</p>
                </div>
                <Switch id="weekly-digest" checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
              </div>
            </CardContent>
          </Card>

          {/* Account Connection */}
          <Card>
            <CardHeader>
              <CardTitle>Google Business Account</CardTitle>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700">✓ Connected to Google Business</p>
                    <p className="text-sm text-gray-500">Your reviews are being automatically synced</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Your Google Business account is not connected. Connect it to automatically sync your reviews.
                  </p>
                  <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                    Connect Google Business
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Sources + Retry */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingSources && <p className="text-sm text-gray-500">Loading sources…</p>}
              {!loadingSources && sources.length === 0 && (
                <p className="text-sm text-gray-500">No sources connected yet.</p>
              )}
              {sources.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-medium">
                      {s.display_name || s.kind.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: {s.status || "—"}
                      {s.error ? ` • ${s.error}` : ""}
                      {s.config?.alias ? ` • ${s.config.alias}` : ""}
                    </div>
                  </div>
                  <RetrySyncButton sourceId={s.id} variant="outline" size="sm" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}