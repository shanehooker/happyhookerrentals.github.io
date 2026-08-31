(function () {
  "use strict";

  const METADATA_URL = "data/metadata.json";

  function assert(condition, message) {
    if (!condition) throw new Error(`Invalid metadata: ${message}`);
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isSafeRelativePath(value) {
    if (typeof value !== "string" || value.length === 0) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) return false;
    return !value.split(/[\\/]/).includes("..");
  }

  function validateMetadata(metadata) {
    assert(isObject(metadata), "root must be an object");
    assert(isObject(metadata.business), "business is required");
    assert(isObject(metadata.delivery), "delivery is required");
    assert(isObject(metadata.pricingRules), "pricingRules is required");
    assert(Array.isArray(metadata.rateTiers), "rateTiers must be an array");
    assert(Array.isArray(metadata.holidays), "holidays must be an array");
    assert(Array.isArray(metadata.campers), "campers must be an array");
    assert(Array.isArray(metadata.fees), "fees must be an array");
    assert(Array.isArray(metadata.addOns), "addOns must be an array");
    ["name", "homeAddress", "contactEmail", "contactPhone"].forEach((key) => {
      assert(typeof metadata.business[key] === "string" && metadata.business[key].trim().length > 0, `business.${key} is required`);
    });
    assert(Number.isFinite(metadata.delivery.pricePerMileOneWay) && metadata.delivery.pricePerMileOneWay >= 0, "delivery.pricePerMileOneWay must be non-negative");
    assert(Number.isFinite(metadata.delivery.minimumFee) && metadata.delivery.minimumFee >= 0, "delivery.minimumFee must be non-negative");
    assert(Number.isFinite(metadata.pricingRules.weeklyThresholdNights) && metadata.pricingRules.weeklyThresholdNights > 0, "pricingRules.weeklyThresholdNights must be positive");

    const websiteKeys = new Set();
    metadata.campers.forEach((camper) => {
      assert(isObject(camper), "each camper must be an object");
      assert(typeof camper.websiteKey === "string" && camper.websiteKey.length > 0, "camper websiteKey is required");
      assert(!websiteKeys.has(camper.websiteKey), `duplicate camper websiteKey '${camper.websiteKey}'`);
      websiteKeys.add(camper.websiteKey);
      assert(typeof camper.shortName === "string" && camper.shortName.length > 0, "camper shortName is required");
      assert(typeof camper.fullName === "string" && camper.fullName.length > 0, "camper fullName is required");
      assert(Number.isFinite(camper.dailyBaseRate) && camper.dailyBaseRate >= 0, "camper dailyBaseRate must be non-negative");
      assert(isObject(camper.status), "camper status is required");
      assert(isObject(camper.website), "camper website is required");

      ["galleryPath", "quotePath", "availabilityPath", "salePagePath", "salePreviewImage"].forEach((key) => {
        if (camper.website[key] !== undefined) {
          assert(isSafeRelativePath(camper.website[key]), `camper website.${key} must be a safe relative path`);
        }
      });

      if (camper.website.galleryImages !== undefined) {
        assert(Array.isArray(camper.website.galleryImages), "camper website.galleryImages must be an array");
        camper.website.galleryImages.forEach((image) => {
          assert(isSafeRelativePath(image), "gallery image names must be safe relative paths");
        });
      }

      if (camper.status.rentable && camper.website.rentalVisible) {
        assert(isSafeRelativePath(camper.website.galleryPath), "rentable camper galleryPath is required");
        assert(Array.isArray(camper.website.galleryImages) && camper.website.galleryImages.length > 0, "rentable camper galleryImages are required");
        assert(isSafeRelativePath(camper.website.quotePath), "rentable camper quotePath is required");
        assert(isSafeRelativePath(camper.website.availabilityPath), "rentable camper availabilityPath is required");
      }

      if (camper.status.forSale && camper.website.saleVisible) {
        assert(isSafeRelativePath(camper.website.salePagePath), "sale camper salePagePath is required");
        assert(isSafeRelativePath(camper.website.salePreviewImage), "sale camper salePreviewImage is required");
        assert(isObject(camper.saleListing) && Number.isFinite(camper.saleListing.price), "sale camper saleListing.price is required");
      }
    });

    return metadata;
  }

  async function load() {
    const response = await fetch(METADATA_URL, {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(`Could not load rental metadata (${response.status})`);
    }

    return validateMetadata(await response.json());
  }

  function getCamperByWebsiteKey(metadata, websiteKey) {
    return metadata.campers.find((camper) => camper.websiteKey === String(websiteKey || "")) || null;
  }

  function getBaseRateTier(metadata) {
    return metadata.rateTiers.find((tier) => tier.id === "base") || metadata.rateTiers[0] || null;
  }

  function getWeeklyRate(metadata, camper) {
    const baseTier = getBaseRateTier(metadata);
    const weeklyDiscount = baseTier ? Number(baseTier.discountPct.weekly) : 0;
    const nights = Number(metadata.pricingRules.weeklyThresholdNights);
    return camper.dailyBaseRate * nights * (1 - weeklyDiscount / 100);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  window.HHRMetadata = Object.freeze({
    load,
    getCamperByWebsiteKey,
    getWeeklyRate,
    formatCurrency,
    isSafeRelativePath
  });
})();
