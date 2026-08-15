[out:json][timeout:90];
(
  nwr["amenity"~"cafe|restaurant|fast_food|ferry_terminal|bar|ice_cream"](13.9004,100.4669,13.9180,100.4912);
  nwr["tourism"~"guest_house|hotel|hostel|attraction|museum|artwork"](13.9004,100.4669,13.9180,100.4912);
  nwr["shop"](13.9004,100.4669,13.9180,100.4912);
  nwr["craft"](13.9004,100.4669,13.9180,100.4912);
  nwr["man_made"="pier"](13.9004,100.4669,13.9180,100.4912);
);
out center tags;
