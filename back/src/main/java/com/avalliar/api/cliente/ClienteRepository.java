package com.avalliar.api.cliente;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    Optional<Cliente> findFirstByCnpj(String cnpj);

    boolean existsByRazaoSocialIgnoreCase(String razaoSocial);
}
