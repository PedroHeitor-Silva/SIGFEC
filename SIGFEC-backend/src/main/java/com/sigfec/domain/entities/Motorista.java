package com.sigfec.domain.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "motorista")
@PrimaryKeyJoinColumn(name = "pessoa_id")
public class Motorista extends Pessoa {

    @Column(unique = true, nullable = false)
    private String cnh;
}
