<img src="https://github.com/user-attachments/assets/9a1ba915-410d-4349-a2ff-4d226aea0a88" width="500" alt="Logo" />

## About

This project aims to implement dynamic export control using Node.js/TypeScript implementing SEP2/IEEE 2030.5-2018/AS 5385:2023 (utility connection) and SunSpec Modbus (inverter connection) to satisfy the dynamic connections requirement of various Austrailan energy markets.   

The initial implementation focuses on the Energy Queensland requirements as outlined in the [SEP2 Client Handbook published by Energy Queensland](https://www.energex.com.au/__data/assets/pdf_file/0007/1072618/SEP2-Client-Handbook-13436740.pdf).

## Requirements

- One or more SunSpec compatible solar inverter(s) (tested with Fronius Primo and Fronius Symo)
- One or more SunSpec compatible smart meter(s) (tested with Fronius Smart Meter and Catch Power Relay)

> [!IMPORTANT]
> The application assumes the smart meter is configured as a feed-in or export/import meter installed at the grid connection to accurately measure the site export/import. Smart meters installed as consumption metering is not supported due to ambiguity if there are other loads or batteries that are not counted towards the site export/import.

## Architecture

```mermaid
sequenceDiagram
    participant U as Utility<br>(SEP2 server)
    participant SC as SEP2 client
    participant C as Coordinator
    participant MC as SunSpec client
    participant D as DER<br>(SunSpec compatible device)

    loop
    SC->>U: Get API responses
    U->>SC: Devices, programs, DER controls
    SC->>U: Acknowledge DER controls
    end

    SC->>C: Export limit, ramp rate

    loop
    MC->>D: Read Modbus registers
    D->>MC: Inverter metrics
    end

    MC->>C: PV power, load power<br>and site power flow

    Note over C: Calculate allowed power level<br>to meet dynamic export requirement

    C-->>MC: % WMax

    MC->>D: Write Modbus registers

    loop
    SC->>U: Send DER status/capability/settings
    SC->>U: Send site and DER telemetry
    end

    box open-dynamic-export
    participant SC
    participant MC
    participant C
    end
```

The initial plan is to implement a SEP2 direct gateway client that interacts directly with the utility server and the DER (solar inverters). This client will be hosted on-site (e.g. home server/Raspberry Pi) using a Docker container and communicate directly with DER in the same local network using Modbus TCP.

The downside of a direct client approach is the registration process is manual and requires generating keys and certificates for each site/NMI. If the project is successful, a future cloud hosted instance will use a cloud proxy gateway architecture to allow self-service registration.

## Implementation plan

1.0
- [x] Project bootstrap
- [x] Private Enterprise Number (PEN) registration
- [x] SEP2 client
  - [x] XML response parsing
  - [x] XML request generation
  - [x] Scheduled polling and pushing
  - [x] DER status/capability/settings reporting
  - [ ] DER control events acknowledgement
  - [x] Telemetry reporting
- [x] SunSpec Modbus client
  - [x] Fronius inverter testing
- [X] Dynamic export control logic

Future
- [ ] Cloud proxy mode
- [ ] Web UI
- [ ] Device package (plug and play solution)

## Private key and CSR

The SEP2 server uses PKI certificates to authorise and identify clients.

As a direct client, there needs to be two certificates, one for the "manufacturer" and one for the "device". The "manufacturer" certificate needs to be signed by the utility Smart Energy Root CA (SERCA). Then the "device" certificate is signed with the "manufacturer" certificate & key.

To generate a key and certificate signing request for either the manufacturer or device.

```bash
openssl ecparam -name secp256r1 -genkey -noout -out key.pem
openssl req -new -key key.pem -out cert_req.csr -sha256 -subj "/CN= /O= "
```

For local testing, generate a valid self signed certificate using

```bash
openssl req -x509 -new -key key.pem -out cert.pem -sha256 -days 3650 -nodes -subj "/C=XX/ST=StateName/L=CityName/O=CompanyName/OU=CompanySectionName/CN=CommonNameOrHostname"
```

For live testing, generate a valid device certificate by signing it with the manufacturer certificate.

```bash
openssl x509 -req -in device_cert_req.csr -CA mica_certificate.pem -CAkey mica_key.pem -CAcreateserial -out device_certificate.pem -days 3650 -sha256
```

Then concatenate the device certificate with the MICA (and SERCA certificate) to form the certificate chain.

```bash
cat device_certificate.pem mica_certificate.pem > cert.pem
```

## Motivation

My parents living in Queensland have a solar PV system and was required to move to Energex's dynamic connection to install an Tesla Powerwal battery because the total inverter capacity was >10kVA. A requirement of the dynamic connection is the use of a "complaint provider" (SEP2 client/device) to manage the solar inverters to meet dynamic export rules.

I opted for the CATCH Power Solar Relay solution since it was already installed at the site (for hot water control) and I wanted to support an Australian company. Unfortunately my experience with their product was subpar due to confusing UIs and a buggy implementation of SunSpec which does not support daisy chained Fronius inverters. I spent considerable time debugging their Modbus implementation and I tried to contact them to help improve their product but they were quite arrogant and not interested in my feedback.

So I thought I should put my efforts on making a better product that is open source since I have an interest in energy markets and was curious about the SEP2/CSIP-AUS standards.

I got in touch with Energy Queensland who was surprisingly helpful (for a government agency) and was open to the idea of an open-source client.

## Resources

- [SEP2 Client Handbook published by Energy Queensland](https://www.energex.com.au/__data/assets/pdf_file/0007/1072618/SEP2-Client-Handbook-13436740.pdf)
- [IEEE 2030.5 standard](https://standards.ieee.org/ieee/2030.5/5897/)
- [IEEE 2030.5 Data Model](https://zepben.github.io/evolve/docs/2030-5/)
- [SEP2 Common Library](https://github.com/ethanndickson/sep2_common) Rust library
- [SEP2-Tools](https://github.com/aguinane/SEP2-Tools) Python library
- [Common Smart Inverter Profile - IEEE 2030.5 Implementation Guide for Smart Inverters v2.1](https://sunspec.org/wp-content/uploads/2019/08/CSIPImplementationGuidev2.103-15-2018.pdf)
- [Common Smart Inverter Profile – Australia v1.1a](https://arena.gov.au/assets/2021/09/common-smart-inverter-profile-australia.pdf)
- [Common Smart Inverter Profile - Australia - Test Procedures v1.0](https://bsgip.com/wp-content/uploads/2023/09/CSIP-AUS-Comms-Client-Test-Procedures-v1.0-final.pdf)
- [SA Power Networks - Dynamic Exports Test Procedure v1.2](https://www.talkingpower.com.au/71619/widgets/376925/documents/239206)
