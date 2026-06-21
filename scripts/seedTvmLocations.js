/**
 * Seed additional Thiruvananthapuram (Trivandrum) district localities.
 *
 * Idempotent: each locality is upserted on { state, district, locality },
 * so running it multiple times will not create duplicates and will not
 * touch the 77 localities that already exist.
 *
 * Usage (from dealr-backend):
 *   node scripts/seedTvmLocations.js
 *
 * Requires MONGO_URI in the environment (.env is loaded automatically).
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const STATE = "Kerala";
const DISTRICT = "Thiruvananthapuram";

// Localities grouped by the "city" buckets already used in the DB.
const LOCALITIES_BY_CITY = {
  Thiruvananthapuram: [
    "Pettah",
    "Kannammoola",
    "Kannettumukku",
    "Murinjapalam",
    "Medical College",
    "Nalanchira",
    "Paruthippara",
    "Pongumoodu",
    "Chalai",
    "Attakulangara",
    "Manjalikulam",
    "Plamoodu",
    "Kunnukuzhy",
    "Bakery Junction",
    "Vellayani",
    "Pravachambalam",
    "Vilappil",
    "Malayinkeezhu",
    "Kachani",
    "Vattappara",
    "Karakulam",
    "Nettayam",
    "Pangode",
    "Chempazhanthy",
    "Vembayam",
    "Andoorkonam",
    "Mangalapuram",
    "Akkulam",
    "Veli",
    "Menamkulam",
    "Vallakadavu",
    "Beemapally",
    "Kochuveli",
    "Kallayam",
    "Pottakuzhi",
    "Vazhayila",
    "Cheruvakkal",
    "Aryanad",
    "Vithura",
    "Ponmudi",
    "Tholicode",
    "Uzhamalackal",
    "Nellanad",
    "Pirappancode",
    "Pullampara",
    "Manickal",
    "Kallara",
    "Anad",
    "Panavoor",
    "Thiruvallam",
    "Mullur",
    "Pozhiyoor",
    "Kottukal",
    "Pulluvila",
    "Poonthura",
    "Muttathara",
    "Karikkakom",
    "Pangappara",
    "Attipra",
    "Chanthavila",
    "Technocity",
    "Murukkumpuzha",
    "Kadinamkulam",
    "Azhoor",
    "Perumathura",
    "Malayam",
    "Maruthamala",
    "Naruvamoodu",
    "Kakkamoola",
    "Ooruttambalam",
    "Mukkola",
    "Thakaraparambu",
    "Attukal",
    "Kaithamukku",
    "Palkulangara",
    "Sreevaraham",
    "Edappazhanji",
    "Jawahar Nagar",
    "Pulimoodu",
    "PMG",
    "Vikas Bhavan",
    "Peringamala",
    "Nanniyode",
    "Pazhakutty",
    // Core city localities (restored)
    "Airport",
    "Ambalamukku",
    "Anayara",
    "Aruvikkara",
    "Chackai",
    "East Fort",
    "Enchakkal",
    "Jagathy",
    "Kaniyapuram",
    "Karamana",
    "Karyavattom",
    "Kattakada",
    "Kazhakkoottam",
    "Kesavadasapuram",
    "Killipalam",
    "Kovalam",
    "Kowdiar",
    "Kudappanakunnu",
    "Kulathoor",
    "Kumarapuram",
    "Kuravankonam",
    "Manacaud",
    "Mannanthala",
    "Maranalloor",
    "Mudavanmugal",
    "Muttada",
    "Nanthancode",
    "Nedumangad",
    "Nemom",
    "Oolampara",
    "Pachalloor",
    "Palayam",
    "Pallippuram",
    "Palode",
    "Pappanamcode",
    "Pattom",
    "Pattoor",
    "Peroorkada",
    "Perumkadavila",
    "Peyad",
    "Poojappura",
    "Poovar",
    "Pothencode",
    "Powdikonam",
    "Sasthamangalam",
    "Shanghumugham",
    "Sreekaryam",
    "Statue Junction",
    "Technopark",
    "Thampanoor",
    "Thirumala",
    "Thumba",
    "Thycaud",
    "Ulloor",
    "Valiathura",
    "Valiyasala",
    "Vamanapuram",
    "Vanchiyoor",
    "Vattiyoorkavu",
    "Vazhuthacaud",
    "Vellanad",
    "Vellayambalam",
    "Vizhinjam",
    "West Fort",
    // New additions
    "Adimalathura",
    "Pulinkudi",
    "Chowara",
    "Kulathummal",
    "Cheruvarakonam",
    "Kudavoor",
    "Mylakkara",
    "Vattavila",
    "Punkulam",
    "Vilappilsala",
    // Further additions
    "Venjaramoodu",
    "Kaduvayil",
    "Maruthoor",
    "Manvila",
    "Chavadimukku",
    "Spencer Junction",
    "Overbridge",
    "Kamaleswaram",
    "Vandithadam",
    "Aramada",
    "Bonacaud",
    "Kallar",
    "Kattakode",
    "Konchiravila",
    // Lesser-known localities / hamlets
    "Kundamankadavu",
    "Punchakkari",
    "Kanjirampara",
    "Kodunganoor",
    "Mukkolakkal",
    "Njandoorkonam",
    "Kaimanam",
    "Cheriyathura",
    "Vettucaud",
    "Puthenthope",
    "Chenkottukonam",
    "Mankayam",
  ],
  Neyyattinkara: [
    "Kanjiramkulam",
    "Vellarada",
    "Kollayil",
    "Ottasekharamangalam",
    "Kunnathukal",
    "Chenkal",
    "Karode",
    "Kuttichal",
    "Aryancode",
    "Aruvippuram",
    "Poovachal",
    "Kallikkad",
    "Athiyannoor",
    "Venganoor",
    "Pallichal",
    "Perumpazhuthoor",
    "Dhanuvachapuram",
    "Amboori",
    "Karumkulam",
    "Thirupuram",
    "Vilavoorkal",
    "Aralumoodu",
    "Plavoor",
    "Vazhichal",
    "Nellimoodu",
    // Core localities (restored)
    "Amaravila",
    "Balaramapuram",
    "Kalliyoor",
    "Marthandam",
    "Neyyattinkara",
    "Parassala",
    "Parasuvaikkal",
    // Further additions
    "Uchakkada",
    "Poovathoor",
  ],
  Attingal: [
    "Vakkom",
    "Anchuthengu",
    "Mudakkal",
    "Kizhuvilam",
    "Nagaroor",
    "Madavoor",
    "Pazhayakunnummel",
    "Pulimath",
    "Karavaram",
    "Pallickal",
    "Edava",
    "Kappil",
    "Cherunniyoor",
    "Ottoor",
    "Manamboor",
    "Avanavancherry",
    "Alamcode",
    "Kallambalam",
    "Vettoor",
    "Elakamon",
    "Ayiroor",
    "Chemmaruthy",
    "Sivapuram",
    // Core localities (restored)
    "Attingal",
    "Chirayinkeezhu",
    "Kadakkavoor",
    "Kilimanoor",
    "Navaikulam",
    "Varkala",
    // Further additions
    "Sarkara",
    "Keezhattingal",
    "Mamom",
    // Lesser-known localities / hamlets
    "Odayam",
    "Akathumuri",
    "Pozhikara",
  ],
};

// Schema is defined locally (strict: false) to match the live document shape
// regardless of the repo's models/locations.model.js, and bound to the
// existing "locations" collection.
const locationSchema = new mongoose.Schema(
  {
    state: String,
    district: String,
    city: String,
    locality: String,
    subLocations: { type: [String], default: [] },
    source: { type: String, default: "seed" },
    usageCount: { type: Number, default: 0 },
  },
  { strict: false, collection: "locations" }
);

const Location = mongoose.model("SeedLocation", locationSchema);

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set. Add it to your .env file.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const ops = [];
  for (const [city, localities] of Object.entries(LOCALITIES_BY_CITY)) {
    for (const locality of localities) {
      ops.push({
        updateOne: {
          filter: { state: STATE, district: DISTRICT, locality },
          update: {
            $setOnInsert: {
              state: STATE,
              district: DISTRICT,
              city,
              locality,
              subLocations: [],
              source: "seed",
              usageCount: 0,
            },
          },
          upsert: true,
        },
      });
    }
  }

  const result = await Location.bulkWrite(ops, { ordered: false });
  const inserted = result.upsertedCount || 0;
  const matched = result.matchedCount || 0;

  console.log(`📍 Total candidates: ${ops.length}`);
  console.log(`✅ Newly inserted:   ${inserted}`);
  console.log(`↩️  Already existed:  ${matched}`);

  await mongoose.disconnect();
  console.log("👋 Disconnected");
}

run().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
