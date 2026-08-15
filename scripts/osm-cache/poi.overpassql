[out:json][timeout:90];
(
  nwr["amenity"~"place_of_worship|cafe|restaurant|fast_food|ferry_terminal|marketplace"](13.9004,100.4669,13.9180,100.4912);
  nwr["tourism"~"guest_house|hostel|hotel|attraction|museum|artwork|viewpoint|information"](13.9004,100.4669,13.9180,100.4912);
  nwr["shop"](13.9004,100.4669,13.9180,100.4912);
  nwr["craft"](13.9004,100.4669,13.9180,100.4912);
  nwr["historic"](13.9004,100.4669,13.9180,100.4912);
  nwr["man_made"="pier"](13.9004,100.4669,13.9180,100.4912);
);
out center tags;
