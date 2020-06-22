<?php

namespace App\Model;

/**
 * Interface for an entity with a Card and a Quantity
 */
interface SlotInterface
{

    /**
     * Get card
     * @return \App\Entity\Card
     */
    public function getCard();

    /**
     * Get quantity
     * @return integer
     */
    public function getQuantity();
}
