(function () {
  "use strict";

  function requireText(value, label) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${label} is missing from metadata.`);
    }
    return value.trim();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const priceElement = document.getElementById("salePrice");
    const locationElement = document.getElementById("saleLocation");

    try {
      const metadata = await HHRMetadata.load();
      const camper = HHRMetadata.getCamperByWebsiteKey(metadata, priceElement.dataset.camperKey);
      if (!camper || !camper.status.active || !camper.status.forSale || !camper.website.saleVisible) {
        throw new Error("This camper is not configured as an active sale listing.");
      }
      if (!camper.saleListing || !Number.isFinite(camper.saleListing.price) || camper.saleListing.price < 0) {
        throw new Error("The sale price is invalid.");
      }

      const terms = requireText(camper.saleListing.terms, "Sale terms");
      const location = requireText(camper.saleListing.location, "Sale location");
      priceElement.textContent = `${HHRMetadata.formatCurrency(camper.saleListing.price)} ${terms}`;
      locationElement.textContent = `\u{1F4CD} Located in ${location}`;
    } catch (error) {
      console.error("Could not render sale metadata:", error);
      priceElement.textContent = "Contact us for the current sale price";
      locationElement.textContent = "Contact us for sale details";
    }
  });
})();
