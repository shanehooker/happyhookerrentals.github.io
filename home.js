(function () {
  "use strict";

  let activeGallery = null;

  function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function createRentalCard(metadata, camper) {
    const card = document.createElement("div");
    card.className = "card mb-4";

    const heading = document.createElement("h3");
    heading.textContent = camper.fullName;
    card.appendChild(heading);

    const pricing = document.createElement("div");
    pricing.className = "pricing";
    const price = document.createElement("div");
    price.className = "price";
    price.append(
      document.createTextNode(`${HHRMetadata.formatCurrency(camper.dailyBaseRate)}/night`),
      document.createElement("br"),
      document.createTextNode(`${HHRMetadata.formatCurrency(HHRMetadata.getWeeklyRate(metadata, camper))}/week`)
    );
    pricing.appendChild(price);
    pricing.appendChild(createButton("View Gallery", "btn", () => openGallery(camper)));

    const quoteLink = document.createElement("a");
    quoteLink.className = "btn quote";
    quoteLink.href = camper.website.quotePath;
    quoteLink.textContent = "Request Quote";
    pricing.appendChild(quoteLink);
    card.appendChild(pricing);

    const summary = document.createElement("p");
    summary.className = "mt-3";
    summary.textContent = `Sleeps up to ${camper.details.sleeps} | ${camper.details.summary}`;
    card.appendChild(summary);

    const preferredImages = camper.website.galleryImages.filter((image) =>
      ["main.jpg", "ext-1.jpg", "int-1.jpg", "layout.jpg"].includes(image)
    );
    const featuredImages = preferredImages.length > 0
      ? preferredImages
      : camper.website.galleryImages.slice(0, 4);
    const safeKey = camper.websiteKey.replace(/[^a-zA-Z0-9_-]/g, "");
    const carouselId = `carousel-${safeKey}`;
    const carousel = document.createElement("div");
    carousel.id = carouselId;
    carousel.className = "carousel slide";
    carousel.dataset.bsWrap = "true";

    const innerCard = document.createElement("div");
    innerCard.className = "card";
    const inner = document.createElement("div");
    inner.className = "carousel-inner";
    featuredImages.forEach((imageName, index) => {
      const item = document.createElement("div");
      item.className = `carousel-item${index === 0 ? " active" : ""}`;
      const image = document.createElement("img");
      image.src = camper.website.galleryPath + imageName;
      image.className = "d-block w-100 rounded-2xl shadow";
      image.alt = `${camper.fullName} photo ${index + 1}`;
      item.appendChild(image);
      inner.appendChild(item);
    });
    innerCard.appendChild(inner);

    [["prev", "Previous"], ["next", "Next"]].forEach(([direction, label]) => {
      const control = document.createElement("button");
      control.className = `carousel-control-${direction}`;
      control.type = "button";
      control.dataset.bsTarget = `#${carouselId}`;
      control.dataset.bsSlide = direction;
      control.setAttribute("aria-label", label);
      const icon = document.createElement("span");
      icon.className = `carousel-control-${direction}-icon`;
      control.appendChild(icon);
      innerCard.appendChild(control);
    });

    carousel.appendChild(innerCard);
    card.appendChild(carousel);
    return card;
  }

  function createSaleCard(camper) {
    const card = document.createElement("div");
    card.className = "card mb-4";
    const row = document.createElement("div");
    row.className = "row align-items-center g-4";
    const details = document.createElement("div");
    details.className = "col-lg-7";

    const pill = document.createElement("span");
    pill.className = "sale-pill";
    pill.textContent = "Now For Sale";
    const heading = document.createElement("h3");
    heading.textContent = camper.fullName;
    const description = document.createElement("p");
    description.textContent = "This camper has a full photo gallery, specs, and contact details on its dedicated sale page.";
    const summary = document.createElement("p");
    summary.className = "small";
    summary.textContent = `Sleeps up to ${camper.details.sleeps} | ${camper.details.summary}`;

    const pricing = document.createElement("div");
    pricing.className = "pricing";
    const price = document.createElement("div");
    price.className = "price";
    price.textContent = `${HHRMetadata.formatCurrency(camper.saleListing.price)} ${camper.saleListing.terms}`;
    const saleLink = document.createElement("a");
    saleLink.className = "btn";
    saleLink.href = camper.website.salePagePath;
    saleLink.textContent = "View Camper For Sale";
    pricing.append(price, saleLink);
    details.append(pill, heading, description, summary, pricing);

    const previewColumn = document.createElement("div");
    previewColumn.className = "col-lg-5";
    const previewLink = document.createElement("a");
    previewLink.href = camper.website.salePagePath;
    const preview = document.createElement("img");
    preview.src = camper.website.salePreviewImage;
    preview.alt = `${camper.fullName} exterior view`;
    preview.className = "sale-preview-img";
    previewLink.appendChild(preview);
    previewColumn.appendChild(previewLink);
    row.append(details, previewColumn);
    card.appendChild(row);
    return card;
  }

  function initializeCarousels() {
    document.querySelectorAll(".carousel").forEach((carouselElement) => {
      let touchStartX = 0;
      carouselElement.addEventListener("touchstart", (event) => {
        touchStartX = event.changedTouches[0].screenX;
      }, { passive: true });
      carouselElement.addEventListener("touchend", (event) => {
        const touchEndX = event.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) carouselElement.querySelector(".carousel-control-next")?.click();
        if (touchEndX > touchStartX + 50) carouselElement.querySelector(".carousel-control-prev")?.click();
      }, { passive: true });

      new bootstrap.Carousel(carouselElement, window.innerWidth >= 768
        ? { interval: 4000, ride: "carousel", wrap: true, pause: "hover" }
        : { interval: false, ride: false, wrap: true });
    });
  }

  function showGalleryImage(index) {
    if (!activeGallery || activeGallery.images.length === 0) return;
    activeGallery.index = (index + activeGallery.images.length) % activeGallery.images.length;
    const mainImage = document.getElementById("mainImage");
    mainImage.src = activeGallery.basePath + activeGallery.images[activeGallery.index];
    mainImage.alt = `${activeGallery.camperName} photo ${activeGallery.index + 1}`;
    document.querySelectorAll(".gallery-thumb").forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("active-thumb", thumbIndex === activeGallery.index);
    });
  }

  function openGallery(camper) {
    activeGallery = {
      basePath: camper.website.galleryPath,
      camperName: camper.fullName,
      images: camper.website.galleryImages.slice(),
      index: 0
    };

    const thumbContainer = document.getElementById("thumbContainer");
    thumbContainer.replaceChildren();
    activeGallery.images.forEach((imageName, index) => {
      const thumb = document.createElement("img");
      thumb.src = activeGallery.basePath + imageName;
      thumb.className = "gallery-thumb rounded shadow-sm";
      thumb.alt = `${camper.fullName} thumbnail ${index + 1}`;
      thumb.addEventListener("click", () => showGalleryImage(index));
      thumbContainer.appendChild(thumb);
    });

    showGalleryImage(0);
    bootstrap.Modal.getOrCreateInstance(document.getElementById("galleryModal")).show();
  }

  function updateBusinessContent(metadata) {
    const email = metadata.business.contactEmail;
    const phone = metadata.business.contactPhone;
    const phoneDigits = String(phone).replace(/\D/g, "");
    [document.getElementById("contactEmailButton"), document.getElementById("footerEmail")].forEach((link) => {
      link.href = `mailto:${email}`;
      if (link.id === "footerEmail") link.textContent = email;
    });
    const footerPhone = document.getElementById("footerPhone");
    footerPhone.textContent = phone;
    if (/^\d{10}$/.test(phoneDigits)) footerPhone.href = `sms:+1${phoneDigits}`;

    const promoEmail = document.getElementById("promoContactEmail");
    promoEmail.textContent = email;
    promoEmail.href = `mailto:${email}`;
    const promoPhone = document.getElementById("promoContactPhone");
    promoPhone.textContent = phone;
    if (/^\d{10}$/.test(phoneDigits)) promoPhone.href = `tel:+1${phoneDigits}`;

    const returnTier = metadata.rateTiers.find((tier) => tier.id === "return-customer");
    if (returnTier) document.getElementById("returnCustomerDiscount").textContent = returnTier.discountPct.nightly;
    document.getElementById("deliveryPrice").textContent = HHRMetadata.formatCurrency(metadata.delivery.pricePerMileOneWay);
    document.getElementById("deliveryMinimum").textContent = HHRMetadata.formatCurrency(metadata.delivery.minimumFee);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const listings = document.getElementById("camperListings");
    document.getElementById("prevBtn").addEventListener("click", () => showGalleryImage(activeGallery ? activeGallery.index - 1 : 0));
    document.getElementById("nextBtn").addEventListener("click", () => showGalleryImage(activeGallery ? activeGallery.index + 1 : 0));

    let touchStartX = 0;
    const mainImage = document.getElementById("mainImage");
    mainImage.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });
    mainImage.addEventListener("touchend", (event) => {
      if (!activeGallery) return;
      const touchEndX = event.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) showGalleryImage(activeGallery.index + 1);
      if (touchEndX > touchStartX + 50) showGalleryImage(activeGallery.index - 1);
    }, { passive: true });

    try {
      const metadata = await HHRMetadata.load();
      updateBusinessContent(metadata);
      listings.replaceChildren();
      metadata.campers
        .filter((camper) => camper.status.active && camper.status.rentable && camper.website.rentalVisible)
        .forEach((camper) => listings.appendChild(createRentalCard(metadata, camper)));
      metadata.campers
        .filter((camper) => camper.status.active && camper.status.forSale && camper.website.saleVisible)
        .forEach((camper) => listings.appendChild(createSaleCard(camper)));
      initializeCarousels();
    } catch (error) {
      console.error("Could not render camper metadata:", error);
      listings.replaceChildren();
      const message = document.createElement("div");
      message.className = "card";
      message.textContent = "Camper listings are temporarily unavailable. Please contact us for current availability.";
      listings.appendChild(message);
    }
  });
})();
