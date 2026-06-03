import mongoose from "mongoose";
import { config } from "dotenv";
config();

const FIELD_RENAME_MAP = {
  TodaySoldQuentity:        "SoldQuentity",
  TodayReturn:              "Return",
  TodayTotaladCost:         "AdCost",
  TodayOtherCost:           "OtherCost",
  TodayDelibaryCostPersale: "DelibaryCostPersale",
  TotalPackgingCost:        "PackgingCost",
  TotalPrductBuyingCost:    "PrductBuyingCost",
  TotalShippingCost:        "ShippingCost",
  TotalTargetSaleAmount:    "TargetSaleAmount",
};

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ DB Connected");

    const collection = mongoose.connection.collection("ProductCost");

    // 👇 Check how many docs need migration (have old field names)
    const totalDocs = await collection.countDocuments({
      TodaySoldQuentity: { $exists: true }, // check one old field as indicator
    });

    if (totalDocs === 0) {
      console.log("⏭️  No docs found with old field names — already migrated or empty");
      return;
    }

    console.log(`📦 Found ${totalDocs} docs to migrate`);

    // 👇 $rename renames all fields in one single operation
    const result = await collection.updateMany(
      { TodaySoldQuentity: { $exists: true } }, // only target un-migrated docs
      { $rename: FIELD_RENAME_MAP }
    );

    console.log(`✅ Migration done — ${result.modifiedCount} docs updated`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 DB Disconnected");
    process.exit(0);
  }
};

runMigration();