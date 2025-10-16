import { NextResponse } from "next/server";
import { syncYelp } from "@/lib/connectors/yelp";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") || "";
  const idOrAlias =
    url.searchParams.get("businessId") || url.searchParams.get("alias") || "";

  try {
    if (!orgId)
      return NextResponse.json(
        { ok: false, error: "orgId required" },
        { status: 400 }
      );
    if (!idOrAlias)
      return NextResponse.json(
        { ok: false, error: "businessId or alias required" },
        { status: 400 }
      );

    const res = await syncYelp(orgId, idOrAlias);
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

// use when u get the yelp business access only
// import { NextResponse } from "next/server";
// import { syncYelp, resolveYelpBusinessId } from "@/lib/connectors/yelp";

// export const runtime = "nodejs";

// export async function GET(req: Request) {
//   const url = new URL(req.url);
//   const orgId = url.searchParams.get("orgId") || "";
//   const businessId = url.searchParams.get("businessId");
//   const name = url.searchParams.get("name");
//   const location = url.searchParams.get("location");

//   try {
//     if (!orgId) {
//       return NextResponse.json(
//         { ok: false, error: "orgId required" },
//         { status: 400 }
//       );
//     }

//     let id = businessId ?? null;

//     // Resolve business id if not provided
//     if (!id && name && location) {
//       id = await resolveYelpBusinessId({ name, location });
//       if (!id) {
//         return NextResponse.json(
//           {
//             ok: false,
//             error: "Could not resolve Yelp businessId from name+location",
//           },
//           { status: 404 }
//         );
//       }
//     }

//     if (!id) {
//       return NextResponse.json(
//         { ok: false, error: "Provide businessId OR name+location" },
//         { status: 400 }
//       );
//     }

//     const res = await syncYelp(orgId, id);
//     return NextResponse.json({ ok: true, ...res }, { status: 200 });
//   } catch (e: any) {
//     // Log the error to your dev console
//     console.error("yelp test route error:", e);
//     return NextResponse.json(
//       { ok: false, error: String(e?.message ?? e) },
//       { status: 500 }
//     );
//   }
// }
// console.log("YELP_API_KEY length:", process.env.YELP_API_KEY?.length ?? 0);
