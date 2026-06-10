import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function usePagination({ currentPage, totalPages }) {
    const [_, setSearchParams] = useSearchParams();

    // handle pagination

    // helper function to update the page number
    // useCallback is used to prevent unnecessary re-renders as this function is used in useEffect
    const updateParams = useCallback(
        (page) => {
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.set("page", page);
                return params;
            });
        },
        [setSearchParams],
    );

    // get the previous page and update the url
    const handlePrevPage = () => {
        if (currentPage > 1) {
            updateParams(currentPage - 1);
        }
    };

    // get the next page and update the url (update the search params)
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            updateParams(currentPage + 1);
        }
    };

    // handle if current page is greater than total pages
    useEffect(() => {
        if (currentPage > totalPages) {
            updateParams(totalPages);
        }
    }, [currentPage, totalPages, updateParams]);

    return { handlePrevPage, handleNextPage };
}
