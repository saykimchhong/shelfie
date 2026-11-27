import Image from "next/image";
import styles from "./PhotoStrip.module.scss";

// The kinds of shops Shelfie is for, as real photos (Unsplash License).
const PHOTOS = [
  { src: "/landing/fruit-stand.jpg", label: "Fruit stalls", alt: "A roadside fruit stand with mangoes and watermelons" },
  { src: "/landing/bakery.jpg", label: "Bakeries", alt: "Fresh bread on bakery shelves" },
  { src: "/landing/street-food.jpg", label: "Street food", alt: "A cook at a street food stall" },
  { src: "/landing/shirts.jpg", label: "Clothing", alt: "Patterned shirts on a rack" },
  { src: "/landing/street-market.jpg", label: "Markets", alt: "Shoppers at an outdoor fruit market" },
  { src: "/landing/cakes.jpg", label: "Cake shops", alt: "Fruit tarts and cakes in a glass display" },
  { src: "/landing/food-stall.jpg", label: "Food stalls", alt: "A vendor cooking at a market food stall" },
  { src: "/landing/fruit-market.jpg", label: "Greengrocers", alt: "A fruit stall full of bananas, apples and oranges" },
  { src: "/landing/tropical-fruit.jpg", label: "Fresh produce", alt: "Dragon fruit, mangoes and passion fruit at a stall" },
];

// A slow, endless row of shop photos. The list is drawn twice so the loop is
// seamless; the copy is hidden from screen readers. Hover pauses it, and with
// reduced motion it stands still and scrolls by hand instead.
export function PhotoStrip() {
  return (
    <div className={styles.strip}>
      <ul className={styles.track}>
        {[...PHOTOS, ...PHOTOS].map((photo, index) => {
          const copy = index >= PHOTOS.length;
          return (
            <li key={index} className={styles.item} aria-hidden={copy || undefined}>
              <figure className={styles.card}>
                <Image src={photo.src} alt={copy ? "" : photo.alt} fill sizes="(min-width: 768px) 260px, 200px" className={styles.photo} />
                <figcaption className={styles.label}>{photo.label}</figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
