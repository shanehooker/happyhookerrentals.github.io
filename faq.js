(function () {
  "use strict";

  function requireNumber(value, label, minimum, maximum) {
    if (!Number.isFinite(value) || value < minimum || (maximum !== undefined && value > maximum)) {
      throw new Error(`${label} is invalid.`);
    }
    return value;
  }

  function findById(items, id, label) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`${label} is missing from metadata.`);
    return item;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`FAQ element '${id}' is missing.`);
    element.textContent = value;
  }

  function appendCancellationRow(tableBody, period, refund) {
    const row = document.createElement("tr");
    const periodCell = document.createElement("td");
    const refundCell = document.createElement("td");
    periodCell.textContent = period;
    refundCell.textContent = refund;
    row.append(periodCell, refundCell);
    tableBody.appendChild(row);
  }

  function formatPeriod(tier) {
    if (tier.maximumDaysBeforeStart === null) {
      return `${tier.minimumDaysBeforeStart} days or more before rental start`;
    }
    if (tier.minimumDaysBeforeStart === tier.maximumDaysBeforeStart) {
      return `${tier.minimumDaysBeforeStart} days before rental start`;
    }
    return `${tier.minimumDaysBeforeStart}–${tier.maximumDaysBeforeStart} days before rental start`;
  }

  function renderRates(metadata) {
    const campers = metadata.campers.filter((camper) =>
      camper.status.active && camper.status.rentable && camper.website.rentalVisible
    );
    if (campers.length === 0) throw new Error("No rentable campers are available in metadata.");

    const rateList = document.getElementById("faqBaseRentalRates");
    rateList.replaceChildren();
    campers.forEach((camper) => {
      const item = document.createElement("li");
      item.textContent = `${camper.shortName}: ${HHRMetadata.formatCurrency(camper.dailyBaseRate)}/night or ` +
        `${HHRMetadata.formatCurrency(HHRMetadata.getWeeklyRate(metadata, camper))}/week`;
      rateList.appendChild(item);
    });

    setText("faqDeliveryPrice", HHRMetadata.formatCurrency(metadata.delivery.pricePerMileOneWay));
    setText("faqDeliveryMinimum", HHRMetadata.formatCurrency(metadata.delivery.minimumFee));

    const returnTier = findById(metadata.rateTiers, "return-customer", "Return-customer rate tier");
    const returnDiscount = requireNumber(returnTier.discountPct.nightly, "Return-customer discount", 0, 100);
    const holidaySurcharges = metadata.holidays
      .map((holiday) => requireNumber(holiday.surchargePct, `Holiday surcharge for ${holiday.id}`, 0, 100))
      .filter((surcharge) => surcharge > 0);
    const uniqueSurcharges = [...new Set(holidaySurcharges)].sort((left, right) => left - right);
    const holidayText = uniqueSurcharges.length === 0
      ? "There are currently no holiday surcharges."
      : uniqueSurcharges.length === 1
        ? `Holiday bookings may include a ${uniqueSurcharges[0]}% surcharge above the base rental rate.`
        : `Holiday bookings may include a ${uniqueSurcharges[0]}%–${uniqueSurcharges[uniqueSurcharges.length - 1]}% surcharge above the base rental rate.`;
    setText("faqRateAdjustments", `${holidayText} Return renters receive ${returnDiscount}% off the nightly rate.`);
  }

  function renderFeesAndTerms(metadata) {
    const pricingRules = metadata.pricingRules;
    const dumpingFee = findById(metadata.fees, "dumping-fee", "Dumping fee");
    setText("faqDumpingFee", HHRMetadata.formatCurrency(requireNumber(dumpingFee.amount, "Dumping fee", 0)));
    setText("faqPetCleaningFee", HHRMetadata.formatCurrency(pricingRules.petCleaningFeeMaximum));
    setText("faqSmokeCleaningFee", HHRMetadata.formatCurrency(pricingRules.smokeCleaningFeeMinimum));
    setText("faqDirectSavingsPct", `${pricingRules.directBookingAverageSavingsPct}%`);
    document.querySelectorAll(".faqDepositAmount").forEach((element) => {
      element.textContent = HHRMetadata.formatCurrency(pricingRules.depositAmount);
    });
    setText("faqSecondPaymentPct", `${pricingRules.paymentSchedule.secondPaymentPctOfBalance}%`);
    setText("faqSecondPaymentDays", `${pricingRules.paymentSchedule.secondPaymentDaysBeforeStart} days`);
  }

  function renderCancellation(metadata) {
    const cancellation = metadata.pricingRules.cancellation;
    const tiers = cancellation.refundTiers.slice().sort((left, right) =>
      right.minimumDaysBeforeStart - left.minimumDaysBeforeStart
    );
    const fullRefundTier = tiers.find((tier) => tier.refundPctExcludingDeposit === 100);
    if (!fullRefundTier) throw new Error("A full-refund cancellation tier is missing from metadata.");

    const deposit = HHRMetadata.formatCurrency(metadata.pricingRules.depositAmount);
    const depositDescription = cancellation.depositIsNonRefundable
      ? `${deposit} deposit is non-refundable. `
      : "";
    setText(
      "faqCancellationIntro",
      `${depositDescription}Cancel at least ${fullRefundTier.minimumDaysBeforeStart} days before the rental start to receive a full refund of all other payments.`
    );

    const tableBody = document.getElementById("faqCancellationRows");
    tableBody.replaceChildren();
    if (cancellation.depositIsNonRefundable) {
      appendCancellationRow(tableBody, `${deposit} non-refundable deposit`, "$0");
    }
    tiers.forEach((tier) => {
      const depositQualifier = cancellation.depositIsNonRefundable ? " (less non-refundable deposit)" : "";
      appendCancellationRow(
        tableBody,
        formatPeriod(tier),
        `${tier.refundPctExcludingDeposit}% of amount paid${depositQualifier}`
      );
    });
  }

  function showFailure(error) {
    console.error("Could not render FAQ metadata:", error);
    setText("faqMetadataStatus", "Current pricing rates and fees are temporarily unavailable. Please contact us.");

    const rateList = document.getElementById("faqBaseRentalRates");
    const item = document.createElement("li");
    item.textContent = "Current rental rates are unavailable.";
    rateList.replaceChildren(item);
    document.querySelectorAll(".metadata-value").forEach((element) => {
      element.textContent = "unavailable";
    });
    setText("faqRateAdjustments", "Current rate adjustments are unavailable.");
    setText("faqCancellationIntro", "Current cancellation terms are unavailable. Please contact us.");

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.textContent = "Current cancellation terms are unavailable.";
    row.appendChild(cell);
    document.getElementById("faqCancellationRows").replaceChildren(row);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const metadata = await HHRMetadata.load();
      renderRates(metadata);
      renderFeesAndTerms(metadata);
      renderCancellation(metadata);
      setText("faqMetadataStatus", "");
    } catch (error) {
      showFailure(error);
    }
  });
})();
