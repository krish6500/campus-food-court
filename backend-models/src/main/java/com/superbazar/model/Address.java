package com.superbazar.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class Address {
    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "mobile", nullable = false, length = 15)
    private String mobile;

    @Column(name = "line_one", nullable = false)
    private String lineOne;

    @Column(name = "line_two")
    private String lineTwo;

    @Column(name = "city", nullable = false)
    private String city;

    @Column(name = "state", nullable = false)
    private String state;

    @Column(name = "pincode", nullable = false, length = 6)
    private String pincode;

    protected Address() {
    }

    public Address(
            String recipientName,
            String mobile,
            String lineOne,
            String lineTwo,
            String city,
            String state,
            String pincode
    ) {
        this.recipientName = requireText(recipientName, "recipientName");
        this.mobile = requireText(mobile, "mobile");
        this.lineOne = requireText(lineOne, "lineOne");
        this.lineTwo = lineTwo;
        this.city = requireText(city, "city");
        this.state = requireText(state, "state");
        this.pincode = validatePincode(pincode);
    }

    public boolean isServiceableBy(ServiceablePincode serviceablePincode) {
        return serviceablePincode != null && serviceablePincode.matches(pincode);
    }

    public String getRecipientName() {
        return recipientName;
    }

    public String getMobile() {
        return mobile;
    }

    public String getLineOne() {
        return lineOne;
    }

    public String getLineTwo() {
        return lineTwo;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public String getPincode() {
        return pincode;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }

        return value.trim();
    }

    private static String validatePincode(String value) {
        String pincode = requireText(value, "pincode");

        if (!pincode.matches("\\d{6}")) {
            throw new IllegalArgumentException("pincode must be 6 digits");
        }

        return pincode;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Address address)) {
            return false;
        }
        return Objects.equals(recipientName, address.recipientName)
                && Objects.equals(mobile, address.mobile)
                && Objects.equals(lineOne, address.lineOne)
                && Objects.equals(lineTwo, address.lineTwo)
                && Objects.equals(city, address.city)
                && Objects.equals(state, address.state)
                && Objects.equals(pincode, address.pincode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(recipientName, mobile, lineOne, lineTwo, city, state, pincode);
    }
}
