<?php

namespace App\Services;

use App\Entity\Card;
use App\Entity\Faction;
use App\Entity\Pack;
use Doctrine\ORM\EntityManager;
use Symfony\Component\DomCrawler\Crawler;

/**
 * Description of DeckImportService
 *
 * @author cedric
 */
class DeckImportService
{
    /**
     *
     * @var EntityManager
     */
    public $em;

    public function __construct(EntityManager $em)
    {
        $this->em = $em;
    }

    public function parseTextImport($text)
    {
        $data = [
            'content' => [],
            'faction' => null,
            'description' => ''
        ];

        $lines = explode("\n", $text);

        if (empty($lines)) {
            return $data;
        }

        // load all packs upfront and map them by their names and codes for easy lookup below
        $packs = $this->em->getRepository(Pack::class)->findAll();
        $packsByName = array_combine(array_map(function (Pack $pack) {
            return $pack->getName();
        }, $packs), $packs);
        $packsByCode = array_combine(array_map(function (Pack $pack) {
            return $pack->getCode();
        }, $packs), $packs);

        foreach ($lines as $line) {
            $matches = [];
            $packNameOrCode = null;
            $card = null;

            if (preg_match('/^\s*(\d)x?([^(]+) \(([^)]+)/u', $line, $matches)) {
                $quantity = intval($matches[1]);
                $name = trim($matches[2]);
                $packNameOrCode = trim($matches[3]);
            } elseif (preg_match('/^\s*(\d)x?([\pLl\pLu\pN\-\.\'\!\:" ]+)/u', $line, $matches)) {
                $quantity = intval($matches[1]);
                $name = trim($matches[2]);
            } elseif (preg_match('/^\s*#\d{3}\s(\d)x?([\pLl\pLu\pN\-\.\'\!\: ]+)/u', $line, $matches)) {
                $quantity = intval($matches[1]);
                $name = trim($matches[2]);
            } elseif (preg_match('/^([^\(]+).*x(\d)/', $line, $matches)) {
                $quantity = intval($matches[2]);
                $name = trim($matches[1]);
            } elseif (preg_match('/^([^\(]+)/', $line, $matches)) {
                $quantity = 1;
                $name = trim($matches[1]);
            } else {
                continue;
            }

            if ($packNameOrCode) {
                /* @var Pack $pack */
                $pack = null;
                if (array_key_exists($packNameOrCode, $packsByName)) {
                    $pack = $packsByName[$packNameOrCode];
                } elseif (array_key_exists($packNameOrCode, $packsByCode)) {
                    $pack = $packsByCode[$packNameOrCode];
                }
                if ($pack) {
                    $card = $this->em->getRepository(Card::class)->findOneBy(array(
                        'name' => $name,
                        'pack' => $pack->getId(),
                    ));
                }
            } else {
                $card = $this->em->getRepository(Card::class)->findOneBy(array(
                    'name' => $name
                ));
            }

            if ($card) {
                $data['content'][$card->getCode()] = $quantity;
            } else {
                $faction = $this->em->getRepository(Faction::class)->findOneBy(array(
                    'name' => $name
                ));
                if ($faction) {
                    $data['faction'] = $faction;
                }
            }
        }

        return $data;
    }

    /**
     * @param $octgn
     * @return array
     * @deprecated
     * @todo Remove this (makes sure to shed the dom-crawler dependency while at it). [ST 2020/05/25]
     */
    public function parseOctgnImport($octgn)
    {
        $data = [
            'content' => [],
            'faction' => null,
            'description' => ''
        ];

        $crawler = new Crawler();
        $crawler->addXmlContent($octgn);

        // read octgnId
        $cardcrawler = $crawler->filter('deck > section > card');
        $octgnIds = [];
        foreach ($cardcrawler as $domElement) {
            $octgnIds[$domElement->getAttribute('id')] = intval($domElement->getAttribute('qty'));
        }

        // read desc
        $desccrawler = $crawler->filter('deck > notes');
        $descriptions = [];
        foreach ($desccrawler as $domElement) {
            $descriptions[] = $domElement->nodeValue;
        }
        $data['description'] = implode("\n", $descriptions);

        foreach ($octgnIds as $octgnId => $qty) {
            $card = $this->em->getRepository(Card::class)->findOneBy(array(
                'octgnId' => $octgnId
            ));
            if ($card) {
                $data['content'][$card->getCode()] = $qty;
            } else {
                $faction = $this->em->getRepository(Faction::class)->findOneBy(array(
                    'octgnId' => $octgnId
                ));
                if ($faction) {
                    $data['faction'] = $faction;
                }
            }
        }
        return $data;
    }
}
