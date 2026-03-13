import { useState, useEffect } from 'react';
import { DATABASES } from '../data/methodology';

export type DataverseDataset = (typeof DATABASES)[number] & {
  url: string;
};

interface DataverseResponse {
  data?: {
    items?: Array<{
      name: string;
      url: string;
      [key: string]: any;
    }>;
  };
}

export function useDataverse() {
  const [datasets, setDatasets] = useState<DataverseDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchDatasets = async () => {
      try {
        setLoading(true);
        setIsFallback(false);

        // Harvard Dataverse Search API timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(
          'https://dataverse.harvard.edu/api/search?q=*&type=dataset&subtree=spp&per_page=50&start=0&sort=date&order=desc',
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Dataverse API connection failed');
        }

        const json = (await response.json()) as DataverseResponse;
        const items = json?.data?.items || [];

        // Match API datasets with our local abbreviations
        if (mounted) {
          const matchedDatasets = DATABASES.map((db) => {
            // Find the dataset whose title contains the abbreviation (e.g., "(SED)")
            const foundItem = items.find((item) =>
              item.name.includes(`(${db.abbr})`) || item.name.includes(db.abbr)
            );
            return {
              ...db,
              // Fallback to DOI if Dataverse doesn't give a valid dataset URL
              url: foundItem?.url || db.doi,
            };
          });
          setDatasets(matchedDatasets);
        }
      } catch (err) {
        console.warn('Dataverse fetch failed, falling back to local dictionary:', err);
        if (mounted) {
          // Fallback exactly to local DOIs as direct links
          const fallbackDatasets = DATABASES.map((db) => ({
            ...db,
            url: db.doi,
          }));
          setDatasets(fallbackDatasets);
          setIsFallback(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDatasets();

    return () => {
      mounted = false;
    };
  }, []);

  return { datasets, loading, isFallback };
}
