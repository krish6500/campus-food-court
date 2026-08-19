package com.superbazar.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "banners")
public class Banner {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    private String subtitle;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "link_url", nullable = false)
    private String linkUrl;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    protected Banner() {
    }

    public Banner(
            String title,
            String subtitle,
            String imageUrl,
            String linkUrl,
            int displayOrder,
            Instant startsAt,
            Instant endsAt
    ) {
        this.title = requireText(title, "title");
        this.subtitle = subtitle;
        this.imageUrl = requireText(imageUrl, "imageUrl");
        this.linkUrl = requireText(linkUrl, "linkUrl");
        this.displayOrder = displayOrder;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.active = true;
    }

    public boolean shouldDisplayAt(Instant instant) {
        boolean afterStart = startsAt == null || !instant.isBefore(startsAt);
        boolean beforeEnd = endsAt == null || instant.isBefore(endsAt);
        return active && afterStart && beforeEnd;
    }

    public void activate() {
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getSubtitle() {
        return subtitle;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getLinkUrl() {
        return linkUrl;
    }

    public boolean isActive() {
        return active;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }

        return value.trim();
    }
}
