package com.superbazar.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "serviceable_pincodes")
public class ServiceablePincode {
    @Id
    @Column(name = "pincode", nullable = false, length = 6)
    private String pincode;

    @Column(name = "city", nullable = false)
    private String city;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    protected ServiceablePincode() {
    }

    public ServiceablePincode(String pincode, String city, boolean active) {
        if (pincode == null || !pincode.matches("\\d{6}")) {
            throw new IllegalArgumentException("pincode must be 6 digits");
        }
        if (city == null || city.isBlank()) {
            throw new IllegalArgumentException("city is required");
        }

        this.pincode = pincode;
        this.city = city.trim();
        this.active = active;
    }

    public boolean matches(String requestedPincode) {
        return active && pincode.equals(requestedPincode);
    }

    public String getPincode() {
        return pincode;
    }

    public String getCity() {
        return city;
    }

    public boolean isActive() {
        return active;
    }
}
